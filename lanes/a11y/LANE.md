# Lane: a11y

Read `BRIEF.md` first. Id prefix: `AX`.

## Goal

Find WCAG 2.2 AA failures. Automated checks catch only part of them, so do the keyboard pass by hand in a script too.

## Roles

- `anon` for public pages, `buyer` for pages behind login.

## In scope

- `axeScan()` on every page, and again after opening each dialog or picker.
- Keyboard only: reach and operate every control with Tab, Shift+Tab, Enter, Space and the arrow keys. Record where focus goes after each action.
- Focus visible on every control.
- Names and labels on every input and button.
- Colour contrast of text, including prices and hints.
- Dialogs: role, name, focus moves in on open and back on close, Escape closes.

## Out of scope

- Layout at 375 px (mobile-375 lane), unless it hides content from assistive tech.
- Security (adversarial lane).

## Severity

Use `a11y` for a WCAG failure that does not block a flow. If a keyboard user cannot finish a flow, use `high`.

## Flows to report in "Flow status"

1. Public pages, axe
2. Logged-in pages, axe
3. Full checkout by keyboard only
4. Dialogs by keyboard

## Already known, do not re-report

- None yet.
