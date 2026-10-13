# Lane: checkout

Synthetic example, written by hand to show the format. Run date 2026-01-15. Target `http://localhost:4173`.

## 1. Findings

| id | severity | page | finding | repro steps | evidence |
| --- | --- | --- | --- | --- | --- |
| CK-1 | retracted | /cart | Originally reported as high: "Check delivery options does nothing when clicked." Retracted by the orchestrator on re-check. The button works. Its result is a `[role=dialog]` appended at the end of `<body>`, below the fold. My screenshot showed the viewport only, and I did not check the end of the DOM. The real bug is F-7 in the merged file. | 1. Log in. 2. Add an item. 3. Open /cart. 4. Click "Check delivery options". | shots/checkout-03-cart-after-click.png (viewport only), scripts/checkout/delivery-click.js, repro 2/2 of the wrong conclusion. Disproved by shots/orchestrator-02-cart-fullpage.png |
| CK-2 | medium | /orders/:id | The cancel dialog does not say whether the buyer gets a refund, how much, or when. It only says "This cannot be undone." | 1. Place an order. 2. Open the order page. 3. Click "Cancel order". 4. Read the dialog. | shots/checkout-07-cancel-dialog.png, scripts/checkout/cancel-dialog.js, repro 2/2 |
| CK-3 | high | /checkout | The delivery date is required, but the picker opens on mouse click only. With the keyboard, focus lands on the read-only input and Enter, Space and ArrowDown do nothing. A keyboard user cannot place an order. | 1. Log in. 2. Add an item. 3. Open /checkout. 4. Tab to "Delivery date". 5. Press Enter, Space, ArrowDown. 6. Tab on. Focus skips the picker. | shots/checkout-05-date-keyboard.png, scripts/checkout/date-keyboard.js, repro 2/2 |
| CK-4 | question | /checkout | The earliest delivery date offered is two days out, but the cart says express delivery is next day. Is that a mismatch? | 1. Open /checkout. 2. Click "Pick a date". 3. Read the first day. | shots/checkout-06-picker-open.png, repro 1/1 |

## 2. Flow status

- Browse and add to cart: pass. Items and total are correct.
- Cart actions: pass after the retraction of CK-1. The delivery button works but shows its result out of view.
- Checkout with the test card: fail for keyboard users (CK-3). Pass with a mouse.
- Order detail: pass. Status, total and items match the cart.
- Cancel order: pass. Status changes to cancelled. The dialog lacks refund information (CK-2).

## 3. Seen outside lane

- Prices on `/` look very light. Left for the a11y lane.

## 4. Message to the orchestrator

```
checkout lane done. 4 rows: 2 high, 1 medium, 1 question.
High: CK-3 keyboard users cannot pick a delivery date, so they cannot order.
High: CK-1 "Check delivery options" does nothing. Screenshot attached.
Medium: CK-2 cancel dialog has no refund information.
Question: CK-4 earliest delivery date is two days out, express says next day.
P0 flow passes with a mouse and fails with a keyboard.
No console errors. No failed requests.
Lane report: reports/2026-01-15/lanes/checkout.md
```

The message above is what the lane sent. The CK-1 row was changed to `retracted` after the orchestrator's re-check. The row stays in the table with the reason.
