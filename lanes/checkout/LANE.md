# Lane: checkout (P0)

Read `BRIEF.md` first. Id prefix: `CK`.

## Goal

Prove that a new customer can go from the product list to a placed order, and that the order page and cancel flow tell the truth. This is the P0 flow. If it breaks, nothing else matters.

## Roles

- `buyer`: a new account made with `signUp()` in this run.

## In scope

- Add to cart from `/`, cart page, cart total.
- Every button on `/cart`, including any that load data.
- `/checkout`: all fields, validation messages, the delivery date, the test card.
- Placing the order and landing on `/orders/:id`.
- `/orders` list and the order detail page.
- The cancel flow: the dialog text, both buttons, the status after cancelling.
- Console errors and failed requests during the flow (`watch()`).

## Out of scope

- Sign-up and login edge cases (auth lane).
- Layout at small widths (mobile-375 lane).
- Full WCAG audit (a11y lane). Do report a keyboard problem that blocks checkout, because it blocks the P0 flow.
- Access to other users' data (adversarial lane).

## Flows to report in "Flow status"

1. Browse and add to cart
2. Cart actions
3. Checkout with the test card
4. Order detail
5. Cancel order

## Already known, do not re-report

- The test card number is printed on the checkout page on purpose.
- `/api/delivery` returns the same options for every cart.
- No real payment happens. There is no payment provider.
