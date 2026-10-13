'use strict';
// Smoke lane: starts the demo shop on a free localhost port, probes each seeded
// bug once, and fails unless the a11y bugs (SB-2, SB-3) and the IDOR (SB-6) are found.
// Headless. No network beyond localhost.

const fs = require('node:fs');
const path = require('node:path');
const { start } = require('../demo-shop/server');
const lib = require('../qa/lib');

const LANE = 'smoke';
const REQUIRED = ['SB-2', 'SB-3', 'SB-6'];

async function main() {
  const { server, url } = await start(0);
  const browser = await lib.launch();
  const results = [];
  const record = (id, detected, evidence) => results.push({ id, detected: Boolean(detected), evidence });
  let n = 0;
  const shot = (page, what, opts) => lib.shot(page, LANE, ++n, what, opts);
  const ctxFor = (role, viewport) => lib.newRoleContext(browser, role, { baseURL: url, viewport });

  try {
    // Anonymous visitor: a11y on sign-up and product list.
    const anon = await ctxFor('anon');
    const ap = await anon.newPage();
    await ap.goto('/signup');
    const signupViolations = await lib.axeScan(ap);
    const label = signupViolations.find((v) => v.id === 'label');
    record('SB-2', label, label ? `axe "label" on ${label.targets.join(', ')}; ${await shot(ap, 'signup-axe')}` : 'no label violation');

    await ap.goto('/');
    const homeViolations = await lib.axeScan(ap);
    const contrast = homeViolations.find((v) => v.id === 'color-contrast' && v.targets.some((t) => t.includes('price')));
    record('SB-3', contrast, contrast ? `axe "color-contrast" on ${contrast.targets.length} price nodes; ${await shot(ap, 'home-axe')}` : 'no price contrast violation');
    await anon.close();

    // Mobile 375 px: horizontal overflow on the product list.
    const mobile = await ctxFor('anon-375', { width: 375, height: 812 });
    const mp = await mobile.newPage();
    await mp.goto('/');
    const widths = await mp.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    record('SB-8', widths.scroll > widths.client, `scrollWidth ${widths.scroll} > clientWidth ${widths.client}; ${await shot(mp, 'home-375')}`);
    await mobile.close();

    // Code brute force: wrong guesses never get throttled.
    const guesser = await ctxFor('guesser');
    const target = lib.uniqueEmail('target');
    await guesser.request.post('/signup', { form: { email: target, password: lib.config.password }, maxRedirects: 0 });
    const gp = await guesser.newPage();
    await gp.goto(`/mailbox?to=${encodeURIComponent(target)}`);
    const realCode = (await gp.locator('.mail-body').first().textContent()).match(/\d{6}/)[0];
    const statuses = [];
    for (let i = 0; statuses.length < 20; i++) {
      const guess = String(i).padStart(6, '0');
      if (guess === realCode) continue;
      const r = await guesser.request.post('/verify', { form: { email: target, code: guess }, maxRedirects: 0 });
      statuses.push(r.status());
    }
    const throttled = statuses.some((s) => s === 429 || s === 423);
    record('SB-5', !throttled && statuses.every((s) => s === 400), `20 wrong codes, statuses: ${[...new Set(statuses)].join(',')}, no 429`);
    await guesser.close();

    // Buyer: cart, delivery check, checkout, order, cancel dialog.
    const buyerCtx = await ctxFor('buyer');
    const bp = await buyerCtx.newPage();
    const errors = lib.watch(bp);
    const buyer = lib.uniqueEmail('buyer');
    await lib.signUp(bp, buyer);
    await bp.click('form[action="/cart/add"] button >> nth=0');
    await bp.waitForURL(/\/cart$/);

    await shot(bp, 'cart-before-click');
    await bp.click('#check-delivery');
    const dialog = bp.locator('[role=dialog]');
    await dialog.waitFor({ state: 'attached' });
    const placement = await bp.evaluate(() => {
      const d = document.querySelector('[role=dialog]');
      return {
        lastInBody: document.body.lastElementChild === d,
        top: Math.round(d.getBoundingClientRect().top),
        viewport: window.innerHeight,
        focusInside: d.contains(document.activeElement),
      };
    });
    const afterClick = await shot(bp, 'cart-after-click');
    record(
      'SB-1',
      placement.lastInBody && placement.top > placement.viewport && !placement.focusInside,
      `dialog is last child of body at y=${placement.top}, viewport ${placement.viewport}, focus not moved; ${afterClick}`
    );

    await bp.goto('/checkout');
    const pickerFocusable = await bp.evaluate(
      () => [...document.querySelectorAll('.datepicker *')].filter((el) => el.tabIndex >= 0 && el.id !== 'delivery').length
    );
    await bp.focus('#delivery');
    for (const key of ['Enter', 'Space', 'ArrowDown']) await bp.keyboard.press(key);
    const keyboardValue = await bp.inputValue('#delivery');
    record('SB-4', pickerFocusable === 0 && keyboardValue === '', `0 focusable picker controls, Enter/Space/ArrowDown leave the date empty; ${await shot(bp, 'checkout-keyboard')}`);

    await bp.fill('#card-name', 'Test Buyer');
    await bp.fill('#card-number', '4242 4242 4242 4242');
    await bp.fill('#card-exp', '12/30');
    await bp.fill('#card-cvc', '123');
    await bp.click('.dp-toggle');
    await bp.click('.dp-day >> nth=0');
    await bp.click('#checkout-form button[type=submit]');
    await bp.waitForURL(/\/orders\/\d+$/);
    const orderPath = new URL(bp.url()).pathname;

    await bp.click('#open-cancel');
    const cancelText = await bp.locator('#cancel-dialog').innerText();
    record('SB-7', !/refund/i.test(cancelText), `cancel dialog text has no "refund": "${cancelText.replace(/\s+/g, ' ').trim()}"; ${await shot(bp, 'cancel-dialog')}`);
    await bp.click('#keep-order');

    // IDOR: a second user opens the buyer's order. Reproduced twice in fresh contexts.
    const other = lib.uniqueEmail('other');
    const sightings = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const ctx = await ctxFor(`other-${attempt}`);
      const op = await ctx.newPage();
      if (attempt === 1) await lib.signUp(op, other);
      else await lib.login(op, other);
      const res = await op.goto(orderPath);
      const shown = await op.locator('.order-email').textContent({ timeout: 2000 }).catch(() => '');
      sightings.push({ status: res.status(), leaked: shown === buyer, shot: await shot(op, `idor-repro-${attempt}`) });
      await ctx.close();
    }
    record('SB-6', sightings.every((s) => s.status === 200 && s.leaked), `other user read ${orderPath} with buyer email, 2 of 2 fresh contexts; ${sightings.map((s) => s.shot).join(', ')}`);

    if (errors.consoleErrors.length || errors.failedRequests.length) {
      console.log('Buyer page console errors:', errors.consoleErrors, 'failed requests:', errors.failedRequests);
    }
    await buyerCtx.close();
  } finally {
    await browser.close();
    server.close();
  }

  results.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
  const found = results.filter((r) => r.detected);
  for (const r of results) console.log(`${r.detected ? 'FOUND ' : 'MISSED'} ${r.id}  ${r.evidence}`);
  const rate = `${found.length}/8 (${Math.round((found.length / 8) * 100)}%)`;
  console.log(`\nSeeded-bug detection rate: ${rate}`);

  const out = path.join(lib.reportDir(), 'smoke.json');
  fs.writeFileSync(out, JSON.stringify({ rate, results }, null, 2));
  console.log(`Report: ${path.relative(path.join(__dirname, '..'), out)}`);

  const missing = REQUIRED.filter((id) => !found.some((r) => r.id === id));
  if (missing.length) {
    console.error(`FAIL: required seeded bugs not detected: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`PASS: required seeded bugs detected (${REQUIRED.join(', ')})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
