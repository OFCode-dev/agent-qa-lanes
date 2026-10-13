# Lane: adversarial

Read `BRIEF.md` first. Id prefix: `AD`.

## Goal

Act as a curious or hostile user with a normal account. Look for ways to see or change data that is not yours.

## Roles

- `victim`: signs up, places an order.
- `attacker`: a second account in a separate context. Never share cookies between the two.
- `anon`: no session.

## In scope

- Object access: change ids in URLs and form fields (`/orders/:id`, `/orders/:id/cancel`, `productId`).
- Direct requests with the attacker's session to endpoints the UI never shows them.
- Input handling: HTML and script in the email field and form fields. Check that output is escaped.
- Session handling: logout really ends the session, cookie flags.
- Guessing: sequential ids, short codes. Keep request volume low, at most 30 attempts per check.

## Out of scope

- Denial of service and load testing.
- Anything outside `BASE_URL`.
- Social engineering and real email.

## Rules on top of BRIEF.md

- Prove impact with the attacker's own screenshot showing the victim's data. A 200 status alone is not proof.
- Never put the victim's password or code in a report.

## Flows to report in "Flow status"

1. Read another user's order
2. Change another user's order
3. Escaping of user input
4. Session end on logout

## Already known, do not re-report

- `/mailbox` is readable without a login. It is a local stand-in for an inbox.
