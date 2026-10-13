# Lane: auth

Read `BRIEF.md` first. Id prefix: `AU`.

## Goal

Check that sign-up, the 6-digit code, login and logout work, and that the code check resists guessing.

## Roles

- `newcomer`: signs up in this run.
- `returning`: the same account, logging in from a fresh context.
- `anon`: no session, for checking protected pages.

## In scope

- `/signup`: validation, duplicate email, password length.
- `/verify`: right code, wrong code, expired or reused code, repeated wrong codes. Cap guessing at 30 attempts per run so the target is not flooded.
- `/login` and logout: wrong password, unverified account, session cookie flags.
- Protected pages without a session: `/cart`, `/checkout`, `/orders`, `/orders/:id`.

## Out of scope

- Reading other users' orders (adversarial lane).
- Visual issues on auth pages (visual-baseline lane).
- Missing labels and contrast (a11y lane).

## Flows to report in "Flow status"

1. Sign up and verify
2. Log in and log out
3. Wrong code handling
4. Protected pages without a session

## Already known, do not re-report

- `/mailbox` is readable without a login. It is a local stand-in for an inbox.
- Codes are sent only to the local mailbox. No email leaves the machine.
