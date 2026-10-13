'use strict';
// Orchestrator re-check of CK-1 ("Check delivery options does nothing").
// Run with the demo shop up: npm run demo, then node examples/sample-run/scripts/orchestrator/recheck-ck1.js
// Applies BRIEF.md rule 4: look for dialogs and at the end of the DOM before calling a button dead.

const lib = require('../../../../qa/lib');

(async () => {
  const browser = await lib.launch();
  const ctx = await lib.newRoleContext(browser, 'orchestrator-buyer');
  const page = await ctx.newPage();
  const log = lib.watch(page);

  await lib.signUp(page, lib.uniqueEmail('orchestrator'));
  await page.click('form[action="/cart/add"] button >> nth=0');
  await page.waitForURL(/\/cart$/);
  await page.click('#check-delivery');
  await page.waitForLoadState('networkidle');

  const state = await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role=dialog], dialog[open]')];
    const last = document.body.lastElementChild;
    return {
      dialogs: dialogs.length,
      lastChild: `${last.tagName.toLowerCase()}${last.getAttribute('role') ? `[role=${last.getAttribute('role')}]` : ''}`,
      lastChildText: last.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
      lastChildTop: Math.round(last.getBoundingClientRect().top),
      viewportHeight: window.innerHeight,
    };
  });
  const viewport = await lib.shot(page, 'orchestrator', 1, 'cart-viewport');
  const full = await lib.shot(page, 'orchestrator', 2, 'cart-fullpage', { fullPage: true });

  console.log(JSON.stringify({ ...state, viewport, full, ...log }, null, 2));
  const verdict =
    state.dialogs > 0 && state.lastChildTop > state.viewportHeight
      ? 'CK-1 retracted: the button works, the dialog is appended below the fold.'
      : 'CK-1 stands: no dialog found after the click.';
  console.log(verdict);
  await browser.close();
})();
