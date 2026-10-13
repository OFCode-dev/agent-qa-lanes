# Lane brief

Every lane agent reads this file first, then its own `lanes/<name>/LANE.md`. If the two conflict, this file wins.

## Setup

- Target: the URL in `BASE_URL` (default `http://localhost:4173`).
- Helpers: `qa/lib.js`. Use `launch()`, `newRoleContext()`, `watch()`, `shot()`, `axeScan()`, `signUp()` and `login()` instead of writing your own.
- Write your scripts to `reports/<date>/<lane>/scripts/`. Write your report to `reports/<date>/<lane>/report.md`.
- Screenshots go to `reports/<date>/shots/<lane>-NN-<what>.png`. `shot()` names them for you.

## Rules

1. **Do your lane only.** Your `LANE.md` lists what is in scope and what is not. If you see a bug outside your lane, add one line under "Seen outside lane" and move on. Do not chase it.

2. **One browser context per role.** Call `newRoleContext()` once for each role (buyer, second user, anonymous visitor). Never reuse a context across roles. Cookies and storage leak otherwise.

3. **Reproduce twice.** A finding counts only after you reproduce it a second time in a fresh browser context. A single sighting goes in the table with severity `question`. Say what blocked the second attempt.

4. **Prove "nothing happened".** Never report a dead button, a missing reaction or a missing message without a screenshot taken after the action. Before you conclude that nothing happened:
   - query `[role=dialog]`, `dialog[open]` and `[aria-live]`,
   - check the last children of `<body>`, where scripts often append modals and toasts,
   - take a full-page screenshot as well as a viewport one,
   - wait for network requests to settle.
   If something did appear but out of view, report that instead. It is a different bug.

5. **Retractions stay in the log.** If a finding turns out to be wrong, change its severity to `retracted`, strike nothing out, and add the reason and the evidence that disproved it. Never delete a row. The orchestrator needs to see what was wrong and why.

6. **Secrets stay inside scripts.** Read passwords, tokens and codes from the environment inside your script. Never print them, put them in a screenshot, paste them into a report or pass them on a command line. If a screenshot would show a secret, mask the field first or skip the screenshot.

7. **Keep every script.** Scripts are evidence. Do not delete or overwrite a script that produced a finding. Save a new version under a new name instead.

8. **Stay on the target.** Send requests only to `BASE_URL`. Use only accounts you created in this run, with addresses on the `.test` domain. Do not test systems you are not authorized to test.

9. **No guessing about severity.** Use the scale below. When unsure, pick the lower one and say why.

## Severity scale

| severity | meaning |
| --- | --- |
| blocker | Data leak, payment or account takeover risk, or the P0 flow cannot finish. |
| high | A main flow fails for a group of users, or a security control is missing. |
| medium | A flow finishes but users lose information or get wrong information. |
| low | Cosmetic or minor friction. |
| a11y | A WCAG 2.2 AA failure that does not block a flow. If it blocks a flow, use `high` or `blocker`. |
| question | Seen once, not yet reproduced, or needs a product decision. |
| retracted | Was reported, later disproved. Keep the row and give the reason. |

## Report format

Your `report.md` has exactly these sections, in this order.

### 1. Findings

```
| id | severity | page | finding | repro steps | evidence |
| --- | --- | --- | --- | --- | --- |
| CK-1 | high | /checkout | Date picker cannot be used with a keyboard | 1. Log in. 2. Add an item. 3. Open /checkout. 4. Tab to the date field. 5. Press Enter, Space, ArrowDown. | shots/checkout-04-keyboard.png, scripts/date-keyboard.js, repro 2/2 |
```

- `id`: your lane prefix plus a number. Never reuse an id, even after a retraction.
- `severity`: one of blocker, high, medium, low, a11y, question, retracted.
- `repro steps`: numbered, short, enough for someone else to repeat.
- `evidence`: screenshot paths, script paths, and the repro count (`repro 2/2`, or `repro 1/1` for a question).

### 2. Flow status

One line per flow in your lane: `flow name: pass | fail | blocked | not run`, then one sentence on why.

### 3. Seen outside lane

Optional. One line each. No investigation.

### 4. Message to the orchestrator

At most 25 lines. Counts by severity, the top three findings in one line each, any retraction, anything that blocked you, and the path to `report.md`. No tables. No secrets.
