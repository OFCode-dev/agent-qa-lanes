# Lane: mobile-375

Read `BRIEF.md` first. Id prefix: `MB`.

## Goal

Check every page at a 375 x 812 viewport, the width of a small phone.

## Roles

- `anon-375` and `buyer-375`. Create both with `newRoleContext(browser, role, { viewport: { width: 375, height: 812 } })`.

## In scope

- Horizontal scrolling: compare `document.documentElement.scrollWidth` with `clientWidth` on every page.
- Text cut off, overlapping or hidden behind other elements.
- Tap targets smaller than 24 x 24 px.
- Header navigation wrapping and still usable.
- Dialogs and pickers fitting on screen.

## Out of scope

- Desktop layout (visual-baseline lane).
- Logic bugs in the flow (checkout lane). Note them under "Seen outside lane".

## Pages

`/`, `/signup`, `/verify`, `/login`, `/mailbox`, `/cart`, `/checkout`, `/orders`, `/orders/:id`.

## Flows to report in "Flow status"

1. Anonymous pages at 375 px
2. Buyer pages at 375 px
3. Cancel dialog at 375 px

## Already known, do not re-report

- Long test email addresses wrap in the header. That is accepted.
