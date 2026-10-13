'use strict';
// Helpers that every lane script uses. CommonJS, no build step.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const ROOT = path.join(__dirname, '..');

// Read .env into process.env without overriding values already set.
// Values stay inside the process. Nothing here prints them.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

/** Settings from the environment. `password` is a secret: never log or screenshot it. */
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:4173',
  password: process.env.QA_PASSWORD || crypto.randomBytes(12).toString('hex'),
  headed: process.env.HEADED === '1',
};

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Launch Chromium. Headless unless HEADED=1.
 * @returns {Promise<import('playwright').Browser>}
 */
function launch() {
  return chromium.launch({ headless: !config.headed });
}

/**
 * Open a fresh browser context for one role. Never share a context between roles:
 * cookies and storage would leak from one role into the other.
 * @param {import('playwright').Browser} browser
 * @param {string} role Label such as "buyer" or "attacker". Stored on the context for logs.
 * @param {{baseURL?: string, viewport?: {width: number, height: number}}} [opts]
 * @returns {Promise<import('playwright').BrowserContext>}
 */
async function newRoleContext(browser, role, opts = {}) {
  const context = await browser.newContext({
    baseURL: opts.baseURL || config.baseUrl,
    viewport: opts.viewport || { width: 1280, height: 720 },
  });
  context.role = role;
  return context;
}

/**
 * Collect console errors, page errors and failed requests for one page.
 * Read the arrays at the end of the step and put them in the report.
 * @param {import('playwright').Page} page
 * @returns {{consoleErrors: string[], failedRequests: string[]}}
 */
function watch(page) {
  const log = { consoleErrors: [], failedRequests: [] };
  page.on('console', (msg) => msg.type() === 'error' && log.consoleErrors.push(msg.text()));
  page.on('pageerror', (err) => log.consoleErrors.push(String(err)));
  page.on('requestfailed', (req) => log.failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => res.status() >= 500 && log.failedRequests.push(`${res.request().method()} ${res.url()} ${res.status()}`));
  return log;
}

/**
 * Today's report folder, `reports/<YYYY-MM-DD>/`. Created if missing.
 * @returns {string} absolute path
 */
function reportDir() {
  const dir = path.join(ROOT, 'reports', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
  return dir;
}

/**
 * Save a screenshot as `reports/<date>/shots/<lane>-NN-<what>.png`.
 * @param {import('playwright').Page} page
 * @param {string} lane e.g. "checkout"
 * @param {number} n step number, padded to two digits
 * @param {string} what short slug, e.g. "after-click"
 * @param {{fullPage?: boolean}} [opts] viewport only by default, which is what a user sees
 * @returns {Promise<string>} path relative to the repo root
 */
async function shot(page, lane, n, what, opts = {}) {
  const file = path.join(reportDir(), 'shots', `${lane}-${String(n).padStart(2, '0')}-${what}.png`);
  await page.screenshot({ path: file, fullPage: Boolean(opts.fullPage) });
  return path.relative(ROOT, file);
}

/**
 * Run axe-core with WCAG 2.x A and AA rules on the current page.
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{id: string, impact: string, help: string, targets: string[]}>>}
 */
async function axeScan(page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(' ')),
  }));
}

/**
 * A unique throwaway address on the reserved `.test` domain.
 * @param {string} role
 * @returns {string}
 */
function uniqueEmail(role) {
  return `${role}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.test`;
}

/**
 * Sign up on the demo shop: fill the form, read the code from the local mailbox, verify.
 * Leaves the page logged in.
 * @param {import('playwright').Page} page
 * @param {string} email
 * @param {string} [password=config.password]
 */
async function signUp(page, email, password = config.password) {
  await page.goto('/signup');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await page.click('form[action="/signup"] button[type=submit]');
  await page.waitForURL(/\/verify/);
  await page.goto(`/mailbox?to=${encodeURIComponent(email)}`);
  const text = await page.locator('.mail-body').first().textContent();
  const code = text.match(/\d{6}/)[0];
  await page.goto(`/verify?email=${encodeURIComponent(email)}`);
  await page.fill('#code', code);
  await page.click('form[action="/verify"] button[type=submit]');
  await page.waitForURL((u) => u.pathname === '/');
}

/**
 * Log in on the demo shop.
 * @param {import('playwright').Page} page
 * @param {string} email
 * @param {string} [password=config.password]
 */
async function login(page, email, password = config.password) {
  await page.goto('/login');
  await page.fill('#li-email', email);
  await page.fill('#li-pass', password);
  await page.click('form[action="/login"] button[type=submit]');
  await page.waitForURL((u) => u.pathname === '/');
}

module.exports = { config, launch, newRoleContext, watch, reportDir, shot, axeScan, uniqueEmail, signUp, login };
