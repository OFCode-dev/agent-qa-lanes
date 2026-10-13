# Seeded bugs

The demo shop contains eight deliberate bugs. This file is the ground truth. Use it to score what the lane agents report.

Do not show this file to lane agents during a run. They should find the bugs on their own.

| id | category | severity | page | bug | where in code |
| --- | --- | --- | --- | --- | --- |
| SB-1 | "nothing happened" trap | low | `/cart` | "Check delivery options" works, but the result is a `[role=dialog]` appended at the end of `<body>`, below the fold. Focus does not move. A tester who looks only at the viewport thinks the button is dead. | `public/app.js` |
| SB-2 | a11y | a11y | `/signup` | The email input has a placeholder and no label. | `server.js`, sign-up form |
| SB-3 | a11y | a11y | `/` | Product prices use `#b3b3b3` on white, about 2.1:1. WCAG AA asks for 4.5:1. | `public/styles.css`, `.price` |
| SB-4 | a11y | high | `/checkout` | The delivery date picker works with a mouse only. The toggle and the day cells are `div`s with no `tabindex`, and the input is read-only. A keyboard user cannot place an order. | `public/app.js`, `server.js` |
| SB-5 | security | high | `/verify` | No rate limit on the 6-digit code. Any number of wrong guesses get the same 400 response. There is no lockout and no 429. | `server.js`, `POST /verify` |
| SB-6 | security (IDOR) | blocker | `/orders/:id` | Any logged-in user can read any order by changing the number in the URL. The page shows the owner's email, delivery date and card last four. Order ids are sequential. | `server.js`, order view |
| SB-7 | UX | medium | `/orders/:id` | The cancel dialog says "This cannot be undone" and nothing about a refund: not whether one is issued, how much, or when. | `server.js`, cancel dialog |
| SB-8 | responsive | medium | `/` | The promo banner has a fixed width of 520 px. At 375 px the page scrolls sideways. | `public/styles.css`, `.promo` |

## Not bugs

These look suspicious but are intended. Report them and they count as false positives.

- `/mailbox` is readable without a login. It is a local stand-in for an email inbox, so the demo needs no external mail service.
- `/api/delivery` returns the same options for every cart.
- Cancelling an order checks the owner. Only viewing it does not (SB-6).
- The test card `4242 4242 4242 4242` is printed on the checkout page on purpose.

## Scoring

A lane finding matches a seeded bug when it names the same page and the same root cause. Severity can differ. A finding that matches nothing in the table above is a false positive, unless it is a real bug nobody planted. In that case add it here.
