# agent-qa-lanes

This repo shows a method for browser QA with several AI agents working in parallel. Each agent gets one "lane", such as checkout, accessibility or security, and a shared brief with strict evidence rules. One orchestrating agent starts the lanes, re-checks the serious findings itself and merges everything into one file. The repo includes a small fake shop with eight documented bugs, so you can run the method and score the result against known answers.

## Evidence rules

1. A finding counts only after a second reproduction in a fresh browser context. A single sighting is a `question`.
2. Each role gets its own browser context. Contexts are never shared.
3. "Nothing happened" needs proof: a screenshot after the action, plus a check of `[role=dialog]` and the end of the DOM.
4. Wrong findings are marked retracted, with the reason. They are never deleted.
5. Secrets stay inside scripts. They never appear in logs, screenshots or reports.
6. Every script is kept. Scripts are evidence.
7. The orchestrator re-checks every blocker and high finding before it accepts one.

The full wording is in [BRIEF.md](BRIEF.md).

## How it fits together

```
                 +----------------+
                 |  Orchestrator  |  reads ORCHESTRATOR.md
                 +-------+--------+
                         | starts in parallel, same BRIEF.md
   +----------+----------+----------+----------+-----------+
   |          |          |          |          |           |
checkout    auth    mobile-375    a11y   visual-baseline adversarial
   |          |          |          |          |           |
   v          v          v          v          v           v
 reports/<date>/lanes/<lane>.md  +  scripts/  +  shots/
                         |
                         | merge, de-duplicate,
                         | re-check blockers and highs
                         v
              reports/<date>/findings.md
```

## Quick start

You need Node 20 or newer.

```
npm install
npx playwright install chromium
npm run demo     # demo shop on http://localhost:4173
npm test         # smoke lane against the demo shop
```

`npm test` starts its own copy of the demo shop on a free port, so you do not need `npm run demo` running. It probes all eight seeded bugs, prints the detection rate and fails unless it finds the accessibility bugs and the order leak. It runs headless and talks only to localhost.

To run a full multi-agent pass, start the demo, then follow [ORCHESTRATOR.md](ORCHESTRATOR.md) with any agent that can read files and run Node.

## What is in the repo

| path | what it is |
| --- | --- |
| `demo-shop/` | Fake shop on plain Node `http`: sign-up with a 6-digit code, a local mailbox, login, cart, checkout, orders, cancel. |
| `demo-shop/SEEDED_BUGS.md` | The eight planted bugs. Ground truth for scoring. Keep it away from lane agents during a run. |
| `qa/lib.js` | Helpers for lane scripts: browser launch, one context per role, console and request watching, screenshots, axe scans, sign-up and login. |
| `BRIEF.md` | The rules every lane agent reads first, and the report format. |
| `lanes/<name>/LANE.md` | Six example lanes: checkout, auth, mobile-375, a11y, visual-baseline, adversarial. |
| `ORCHESTRATOR.md` | How the coordinating agent starts lanes, merges results and sends updates. |
| `examples/sample-run/` | A synthetic run: three lane reports, a merged file and one retraction. |
| `test/smoke.js` | The smoke lane behind `npm test`. |

Output goes to `reports/<date>/`, which git ignores.

## Point it at your own staging site

Only test systems you own or have written permission to test. Probing a site without permission can be illegal, even when your intent is good. Never point the adversarial lane at production.

1. Copy `.env.example` to `.env` and set `BASE_URL` to your staging site. Put any test password in `QA_PASSWORD`. `.env` is git-ignored.
2. Replace the demo helpers in `qa/lib.js` (`signUp`, `login`) with your site's sign-up and login steps. Keep the function names so lane scripts still work.
3. Edit the lane files in `lanes/`. Set the scope, the pages and the "already known" list for your product. Delete lanes you do not need.
4. Follow `ORCHESTRATOR.md`. Without a seeded bug list, skip the scoring step.

`npm test` always runs against the bundled demo shop. It does not read `BASE_URL`.

## License

MIT. See [LICENSE](LICENSE).
