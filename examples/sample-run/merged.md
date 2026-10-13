# Merged findings, 2026-01-15

Synthetic example, written by hand to show the format. It is what an orchestrator writes to `reports/<date>/findings.md` after merging three lanes against the demo shop.

## Summary

- Lanes run: checkout, a11y, adversarial. Not run: auth, mobile-375, visual-baseline.
- Lane rows in: 11. Merged rows: 9. Duplicates folded: 1 (CK-3 and AX-3). Retractions: 1 (CK-1).
- Accepted by severity: 1 blocker, 2 high, 1 medium, 3 a11y.
- Not accepted: 2 false positives (F-8, F-9).
- Re-checked by the orchestrator: every blocker and high (F-1, F-2, F-3, and CK-1 before it was retracted).
- Seeded-bug detection: 7 of 8 (88%). SB-8, the 375 px overflow, was missed because the mobile-375 lane did not run.

## Findings

| id | lanes | severity | status | page | finding | evidence | maps to |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-1 | AD-1 | blocker | confirmed | /orders/:id | Any logged-in user can read any order by number. Shows email, delivery date and card last four. Ids are sequential. | shots/adversarial-04-attacker-sees-order.png, shots/orchestrator-03-idor.png | SB-6 |
| F-2 | AD-2 | high | confirmed | /verify | No rate limit or lockout on the 6-digit code. | scripts/adversarial/code-guess.js. The orchestrator re-ran 20 attempts: all 400, none 429. | SB-5 |
| F-3 | CK-3, AX-3 | high | confirmed | /checkout | The delivery date picker is mouse-only and the date is required, so keyboard users cannot place an order. | shots/checkout-05-date-keyboard.png, shots/a11y-05-checkout-tab-order.png, shots/orchestrator-04-date-keyboard.png | SB-4 |
| F-4 | CK-2 | medium | accepted | /orders/:id | The cancel dialog says nothing about a refund. | shots/checkout-07-cancel-dialog.png | SB-7 |
| F-5 | AX-1 | a11y | accepted | /signup | The email input has no accessible name. | shots/a11y-02-signup-axe.png | SB-2 |
| F-6 | AX-2 | a11y | accepted | / | Price text contrast is 2.1:1. | shots/a11y-01-home-axe.png | SB-3 |
| F-7 | AX-4 | a11y | accepted | /cart | "Check delivery options" shows its result in a dialog appended at the end of `<body>`, below the fold, with no focus move. This is the real bug behind the retracted CK-1. | shots/a11y-07-cart-fullpage.png, shots/orchestrator-02-cart-fullpage.png | SB-1 |
| F-8 | CK-4 | question | false positive | /checkout | The earliest delivery date is two days out while express says next day. A product question, not a defect in the demo. | shots/checkout-06-picker-open.png | none |
| F-9 | AD-3 | low | false positive | /mailbox | Mailbox is open without login. It is on the lane's "already known" list and under "Not bugs" in SEEDED_BUGS.md. The lane should not have reported it. | shots/adversarial-06-mailbox.png | none |

## Retractions

| id | lane id | original claim | reason | evidence |
| --- | --- | --- | --- | --- |
| R-1 | CK-1 | high: "Check delivery options does nothing when clicked." | The orchestrator re-checked it because it was a high. After the click, `document.body.lastElementChild` is `div[role=dialog]` with the delivery options, at y=1389 in a 720 px viewport. The lane's viewport screenshot could not show it, and the lane did not check `[role=dialog]` or the end of the DOM (BRIEF.md rule 4). The real problem is filed as F-7. | scripts/orchestrator/recheck-ck1.js, shots/orchestrator-01-cart-viewport.png, shots/orchestrator-02-cart-fullpage.png |

## Flow status

- Browse and add to cart: pass.
- Cart actions: pass, with F-7.
- Checkout with a mouse: pass.
- Checkout with a keyboard: fail (F-3).
- Order detail: pass for the owner, but readable by others (F-1).
- Cancel order: pass, with F-4. The owner check works.
- Escaping of user input: pass.
- Logout ends the session: pass.
- Sign-up code guessing: fail (F-2).

## Questions for the team

1. Should the earliest delivery date match the "next day" express option on the cart page (F-8)?
2. When we fix F-1, should a wrong order id return 404 or 403? 404 avoids confirming that the order exists.

## Final message to the user

```
QA run 2026-01-15 done. 3 lanes: checkout, a11y, adversarial.
Accepted: 1 blocker, 2 high, 1 medium, 3 a11y.
Blocker: F-1 any user can read any order (/orders/:id).
High: F-2 no rate limit on the sign-up code.
High: F-3 keyboard users cannot check out (date picker).
Retracted: CK-1 "dead" delivery button. The dialog was at the end of the DOM.
False positives: 2. Seeded bugs found: 7 of 8. Missed SB-8, mobile lane not run.
Failed flows: keyboard checkout, code guessing.
Details: reports/2026-01-15/findings.md
```
