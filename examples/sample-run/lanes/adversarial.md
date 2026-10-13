# Lane: adversarial

Synthetic example, written by hand to show the format. Run date 2026-01-15. Target `http://localhost:4173`.

## 1. Findings

| id | severity | page | finding | repro steps | evidence |
| --- | --- | --- | --- | --- | --- |
| AD-1 | blocker | /orders/:id | The attacker can read the victim's order by its number. The page shows the victim's email, delivery date and card last four. Order numbers are sequential from 1001, so every order is reachable. | 1. Victim signs up and places an order, gets /orders/1001. 2. Attacker signs up in a separate context. 3. Attacker opens /orders/1001. | shots/adversarial-04-attacker-sees-order.png, scripts/adversarial/idor-order.js, repro 2/2 |
| AD-2 | high | /verify | No limit on wrong codes. 30 wrong guesses in a row all return 400 with the same page. No delay, no lockout, no 429. The code has one million values, so a script can guess it. | 1. Sign up with a new email. 2. POST /verify with 30 wrong codes. 3. Compare the responses. | scripts/adversarial/code-guess.js (30 attempts, statuses logged), repro 2/2 |
| AD-3 | low | /mailbox | Anyone can read the sign-up codes of every account at `/mailbox` without logging in. | 1. Open /mailbox in a context with no session. | shots/adversarial-06-mailbox.png, repro 2/2 |

## 2. Flow status

- Read another user's order: fail (AD-1).
- Change another user's order: pass. POST /orders/1001/cancel from the attacker returns 403.
- Escaping of user input: pass. `<b>x</b>` in the email field renders as text on /verify and /mailbox.
- Session end on logout: pass. The old cookie no longer opens /cart after logout.

## 3. Seen outside lane

- None.

## 4. Message to the orchestrator

```
adversarial lane done. 3 rows: 1 blocker, 1 high, 1 low.
Blocker: AD-1 any user can read any order, ids are sequential.
High: AD-2 no rate limit on the 6-digit code.
Low: AD-3 /mailbox is open without login.
Cancel is owner-checked. Escaping and logout passed.
No victim codes or passwords in the lane report. Scripts read them internally.
Lane report: reports/2026-01-15/lanes/adversarial.md
```
