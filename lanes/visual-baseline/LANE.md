# Lane: visual-baseline

Read `BRIEF.md` first. Id prefix: `VB`.

## Goal

Capture a reference screenshot of every page and state at 1280 x 720, so later runs can compare against it. Report only what is plainly broken on screen.

## Roles

- `anon` and `buyer`.

## In scope

- One viewport and one full-page shot per page, named `visual-baseline-NN-<page>-<state>.png`.
- States: empty cart, cart with items, checkout with picker open, order placed, cancel dialog open, order cancelled.
- Broken images, overlapping text, unstyled pages, missing fonts.
- Content that appears outside the viewport after an action. Take a full-page shot to show where it went.

## Out of scope

- Pixel diffs against an older run. This lane makes the baseline.
- Contrast and labels (a11y lane).
- Small screens (mobile-375 lane).

## Output

Besides your lane report, write `reports/<date>/lanes/visual-baseline-index.md`: one line per screenshot with the page, the state and the file name.

## Flows to report in "Flow status"

1. Public pages captured
2. Buyer pages captured
3. Dialog states captured

## Already known, do not re-report

- The header shows the full email address of the logged-in user. That is by design.
