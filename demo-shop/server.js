'use strict';
// Demo shop for agent-qa-lanes. Plain Node http, in-memory data.
// It contains deliberate bugs. See SEEDED_BUGS.md before changing anything.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PUBLIC_DIR = path.join(__dirname, 'public');

const PRODUCTS = [
  { id: 1, name: 'Canvas tote bag', price: 1800 },
  { id: 2, name: 'Enamel mug', price: 1200 },
  { id: 3, name: 'Notebook, dotted', price: 900 },
  { id: 4, name: 'Desk lamp', price: 4500 },
];

/** Fresh in-memory state. One per server instance. */
function createState() {
  return {
    users: new Map(), // email -> { id, email, passHash, salt, verified, code }
    sessions: new Map(), // sid -> userId
    carts: new Map(), // userId -> [productId]
    orders: new Map(), // id -> order
    mailbox: [], // { to, subject, body, at }
    nextUserId: 1,
    nextOrderId: 1001,
  };
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const hash = (password, salt) => crypto.scryptSync(password, salt, 32).toString('hex');

function page(title, user, body) {
  const nav = user
    ? `<a href="/cart">Cart</a> <a href="/orders">My orders</a>
       <form method="post" action="/logout" class="inline"><button type="submit">Log out</button></form>
       <span class="who">${esc(user.email)}</span>`
    : '<a href="/login">Log in</a> <a href="/signup">Sign up</a>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Demo Shop</title>
<link rel="stylesheet" href="/static/styles.css">
</head>
<body>
<header><nav aria-label="Main"><a href="/" class="brand">Demo Shop</a> ${nav} <a href="/mailbox">Mailbox</a></nav></header>
<main>
<h1>${esc(title)}</h1>
${body}
</main>
<footer><p>Demo Shop is a fake store for QA practice. Nothing here is real.</p></footer>
<script src="/static/app.js"></script>
</body>
</html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e5) req.destroy();
    });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(data))));
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

function createHandler(state) {
  const userById = (id) => [...state.users.values()].find((u) => u.id === id);

  function startSession(res, user) {
    const sid = crypto.randomBytes(18).toString('hex');
    state.sessions.set(sid, user.id);
    res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`);
  }

  function send(res, status, html) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
  const redirect = (res, to) => {
    res.writeHead(303, { Location: to });
    res.end();
  };

  function serveStatic(res, name) {
    const file = path.join(PUBLIC_DIR, path.basename(name));
    if (!fs.existsSync(file)) return send(res, 404, 'Not found');
    const type = file.endsWith('.css') ? 'text/css' : 'text/javascript';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    fs.createReadStream(file).pipe(res);
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const sid = parseCookies(req).sid;
    const user = sid && state.sessions.has(sid) ? userById(state.sessions.get(sid)) : null;
    const post = req.method === 'POST';
    const body = post ? await readBody(req) : {};

    if (p.startsWith('/static/')) return serveStatic(res, p.slice(8));

    // Product list. SB-3 (low-contrast price) lives in styles.css .price.
    // SB-8 (375 px overflow) is the fixed-width .promo banner.
    if (p === '/' && !post) {
      const items = PRODUCTS.map(
        (pr) => `<li class="product">
  <h2>${esc(pr.name)}</h2>
  <p class="price">${money(pr.price)}</p>
  <form method="post" action="/cart/add"><input type="hidden" name="productId" value="${pr.id}">
  <button type="submit">Add to cart</button></form>
</li>`
      ).join('\n');
      return send(
        res,
        200,
        page('Products', user, `<div class="promo">Free delivery on orders over $40. Use code WELCOME at checkout.</div>
<ul class="products">${items}</ul>`)
      );
    }

    // Sign-up. SB-2: "Email" is plain text, not a <label>. The input has no accessible name.
    if (p === '/signup' && !post) {
      return send(
        res,
        200,
        page('Sign up', user, `<form method="post" action="/signup" class="stack">
  <span class="field-name">Email</span>
  <input type="email" name="email" required>
  <label for="su-pass">Password</label>
  <input id="su-pass" type="password" name="password" minlength="8" required>
  <button type="submit">Create account</button>
</form>`)
      );
    }
    if (p === '/signup' && post) {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email.includes('@') || password.length < 8) {
        return send(res, 400, page('Sign up', user, '<p role="alert">Enter an email and a password of 8 or more characters.</p>'));
      }
      if (state.users.has(email) && state.users.get(email).verified) {
        return send(res, 409, page('Sign up', user, '<p role="alert">That email already has an account. <a href="/login">Log in</a>.</p>'));
      }
      const salt = crypto.randomBytes(8).toString('hex');
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
      state.users.set(email, { id: state.nextUserId++, email, salt, passHash: hash(password, salt), verified: false, code });
      state.mailbox.push({ to: email, subject: 'Your Demo Shop code', body: `Your code is ${code}`, at: new Date().toISOString() });
      return redirect(res, `/verify?email=${encodeURIComponent(email)}`);
    }

    // Code check. SB-5: no attempt limit, no lockout, no 429.
    if (p === '/verify' && !post) {
      const email = url.searchParams.get('email') || '';
      return send(
        res,
        200,
        page('Enter your code', user, `<p>We sent a 6-digit code to ${esc(email)}. Open the <a href="/mailbox?to=${encodeURIComponent(email)}">mailbox</a> to read it.</p>
<form method="post" action="/verify" class="stack">
  <input type="hidden" name="email" value="${esc(email)}">
  <label for="code">6-digit code</label>
  <input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" required>
  <button type="submit">Verify</button>
</form>`)
      );
    }
    if (p === '/verify' && post) {
      const u = state.users.get(String(body.email || '').toLowerCase());
      if (!u || u.verified || body.code !== u.code) {
        return send(res, 400, page('Enter your code', user, '<p role="alert">That code is not correct.</p>'));
      }
      u.verified = true;
      startSession(res, u);
      return redirect(res, '/');
    }

    // Local mailbox. A dev tool, open by design. Not a seeded bug.
    if (p === '/mailbox') {
      const to = (url.searchParams.get('to') || '').toLowerCase();
      const list = state.mailbox
        .filter((m) => !to || m.to === to)
        .reverse()
        .map((m) => `<li class="mail"><strong>${esc(m.subject)}</strong> to ${esc(m.to)}<br><span class="mail-body">${esc(m.body)}</span></li>`)
        .join('\n');
      return send(res, 200, page('Mailbox', user, `<p>Local test mailbox. Messages from this server only.</p><ul class="mails">${list || '<li>No messages.</li>'}</ul>`));
    }

    if (p === '/login' && !post) {
      return send(
        res,
        200,
        page('Log in', user, `<form method="post" action="/login" class="stack">
  <label for="li-email">Email</label>
  <input id="li-email" type="email" name="email" required>
  <label for="li-pass">Password</label>
  <input id="li-pass" type="password" name="password" required>
  <button type="submit">Log in</button>
</form>`)
      );
    }
    if (p === '/login' && post) {
      const u = state.users.get(String(body.email || '').trim().toLowerCase());
      if (!u || !u.verified || hash(String(body.password || ''), u.salt) !== u.passHash) {
        return send(res, 401, page('Log in', user, '<p role="alert">Email or password is not correct. <a href="/login">Try again</a>.</p>'));
      }
      startSession(res, u);
      return redirect(res, '/');
    }
    if (p === '/logout' && post) {
      state.sessions.delete(sid);
      res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/');
      return redirect(res, '/');
    }

    // Everything below needs a session.
    if (!user) {
      if (p === '/cart' || p === '/cart/add' || p === '/checkout' || p.startsWith('/orders') || p === '/api/delivery') {
        return redirect(res, '/login');
      }
      return send(res, 404, page('Not found', user, '<p>No page here.</p>'));
    }

    if (p === '/cart/add' && post) {
      const id = Number(body.productId);
      if (PRODUCTS.some((pr) => pr.id === id)) {
        state.carts.set(user.id, [...(state.carts.get(user.id) || []), id]);
      }
      return redirect(res, '/cart');
    }

    // Cart. SB-1: "Check delivery options" appends its result at the end of
    // the DOM, below the fold, with no focus move (see app.js).
    if (p === '/cart' && !post) {
      const ids = state.carts.get(user.id) || [];
      const lines = ids.map((id) => PRODUCTS.find((pr) => pr.id === id));
      const total = lines.reduce((s, pr) => s + pr.price, 0);
      const list = lines.map((pr) => `<li>${esc(pr.name)} <span>${money(pr.price)}</span></li>`).join('');
      return send(
        res,
        200,
        page('Your cart', user, ids.length
          ? `<ul class="cart">${list}</ul><p class="total">Total: ${money(total)}</p>
<p><button type="button" id="check-delivery">Check delivery options</button></p>
<p><a class="button" href="/checkout">Go to checkout</a></p>
<section class="info"><h2>Delivery and returns</h2>
<p>We ship from a small warehouse. Most orders leave within two working days.</p>
<p>Returns are free within 30 days. Keep the original packaging.</p>
<p>Questions? Use the contact form on the help page.</p></section>`
          : '<p>Your cart is empty. <a href="/">Browse products</a>.</p>')
      );
    }
    if (p === '/api/delivery') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ options: ['Standard, 3 to 5 days, free', 'Express, next day, $9.00'] }));
    }

    // Checkout. SB-4: the delivery date picker only works with a mouse.
    if (p === '/checkout' && !post) {
      const ids = state.carts.get(user.id) || [];
      if (!ids.length) return redirect(res, '/cart');
      return send(
        res,
        200,
        page('Checkout', user, `<form method="post" action="/checkout" class="stack" id="checkout-form">
  <label for="card-name">Name on card</label>
  <input id="card-name" name="cardName" autocomplete="cc-name" required>
  <label for="card-number">Card number</label>
  <input id="card-number" name="cardNumber" inputmode="numeric" autocomplete="cc-number" required>
  <label for="card-exp">Expiry (MM/YY)</label>
  <input id="card-exp" name="cardExp" autocomplete="cc-exp" required>
  <label for="card-cvc">Security code</label>
  <input id="card-cvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" required>
  <label for="delivery">Delivery date</label>
  <div class="datepicker">
    <input id="delivery" name="delivery" readonly required>
    <div class="dp-toggle">Pick a date</div>
    <div class="dp-grid" hidden></div>
  </div>
  <p class="hint">Test card: 4242 4242 4242 4242. No real payment is made.</p>
  <button type="submit">Place order</button>
</form>`)
      );
    }
    if (p === '/checkout' && post) {
      const ids = state.carts.get(user.id) || [];
      const digits = String(body.cardNumber || '').replace(/\s/g, '');
      if (!ids.length || !/^\d{16}$/.test(digits) || !/^\d{4}-\d{2}-\d{2}$/.test(body.delivery || '')) {
        return send(res, 400, page('Checkout', user, '<p role="alert">Check the card number and pick a delivery date. <a href="/checkout">Back to checkout</a>.</p>'));
      }
      const items = ids.map((id) => PRODUCTS.find((pr) => pr.id === id));
      const order = {
        id: state.nextOrderId++,
        userId: user.id,
        email: user.email,
        items,
        total: items.reduce((s, pr) => s + pr.price, 0),
        delivery: body.delivery,
        cardLast4: digits.slice(-4),
        status: 'placed',
      };
      state.orders.set(order.id, order);
      state.carts.set(user.id, []);
      return redirect(res, `/orders/${order.id}`);
    }

    if (p === '/orders' && !post) {
      const mine = [...state.orders.values()].filter((o) => o.userId === user.id);
      const list = mine.map((o) => `<li><a href="/orders/${o.id}">Order ${o.id}</a>, ${money(o.total)}, ${o.status}</li>`).join('');
      return send(res, 200, page('My orders', user, `<ul>${list || '<li>No orders yet.</li>'}</ul>`));
    }

    const m = p.match(/^\/orders\/(\d+)(\/cancel)?$/);
    if (m) {
      const order = state.orders.get(Number(m[1]));
      if (!order) return send(res, 404, page('Not found', user, '<p>No such order.</p>'));

      // Cancelling checks the owner. Viewing does not.
      if (m[2] && post) {
        if (order.userId !== user.id) return send(res, 403, page('Forbidden', user, '<p>Not your order.</p>'));
        order.status = 'cancelled';
        return redirect(res, `/orders/${order.id}`);
      }

      // SB-6: no owner check here. Any logged-in user can read any order.
      // SB-7: the cancel dialog says nothing about refunds.
      const items = order.items.map((pr) => `<li>${esc(pr.name)} ${money(pr.price)}</li>`).join('');
      const cancel = order.status === 'placed'
        ? `<button type="button" id="open-cancel">Cancel order</button>
<dialog id="cancel-dialog" aria-labelledby="cancel-title">
  <h2 id="cancel-title">Cancel this order?</h2>
  <p>This cannot be undone.</p>
  <form method="post" action="/orders/${order.id}/cancel">
    <button type="button" id="keep-order">Keep order</button>
    <button type="submit">Yes, cancel</button>
  </form>
</dialog>`
        : '';
      return send(
        res,
        200,
        page(`Order ${order.id}`, user, `<dl class="order">
  <dt>Customer</dt><dd class="order-email">${esc(order.email)}</dd>
  <dt>Status</dt><dd class="order-status">${order.status}</dd>
  <dt>Delivery date</dt><dd>${esc(order.delivery)}</dd>
  <dt>Card</dt><dd>ending ${order.cardLast4}</dd>
  <dt>Total</dt><dd>${money(order.total)}</dd>
</dl>
<ul>${items}</ul>
${cancel}`)
      );
    }

    return send(res, 404, page('Not found', user, '<p>No page here.</p>'));
  };
}

/**
 * Start the demo shop.
 * @param {number} [port=4173] Use 0 for a free port.
 * @returns {Promise<{server: http.Server, url: string}>}
 */
function start(port = 4173) {
  const handler = createHandler(createState());
  const server = http.createServer((req, res) =>
    handler(req, res).catch((err) => {
      console.error(err);
      res.writeHead(500);
      res.end('Server error');
    })
  );
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://localhost:${server.address().port}` }))
  );
}

module.exports = { start };

if (require.main === module) {
  start(Number(process.env.PORT) || 4173).then(({ url }) => console.log(`Demo shop running at ${url}`));
}
