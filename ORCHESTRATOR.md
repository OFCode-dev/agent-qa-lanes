# Orchestrator guide

One coordinating agent runs the lanes, merges their reports and decides what counts as a finding. This guide describes the protocol. It works with any agent that can read files, write files and run Node: a coding agent with subagents, several terminal sessions, or a person with a checklist.

## Roles

- **Orchestrator.** Starts lanes, answers their questions, merges reports, re-checks high-severity findings, sends progress updates. It does not test inside a lane.
- **Lane agent.** Reads `BRIEF.md` and one `lanes/<name>/LANE.md`, tests only that lane, writes one report.

## Before the run

1. Check that the target is up: `curl -s -o /dev/null -w "%{http_code}" "$BASE_URL"` returns 200.
2. Check that you are authorized to test the target. For anything other than the demo shop, get this in writing.
3. Create `reports/<date>/lanes/`, `reports/<date>/scripts/` and `reports/<date>/shots/`.
4. Update the "Already known, do not re-report" list in each `LANE.md` with accepted findings from earlier runs.
5. Put secrets in `.env`. Never paste them into a lane prompt.

## Start the lanes in parallel

Give each lane agent the same short prompt and change only the lane name:

```
You are the <lane> lane. Read BRIEF.md, then lanes/<lane>/LANE.md.
Target: the BASE_URL in .env. Helpers: qa/lib.js.
Write scripts to reports/<date>/scripts/<lane>/ and your report to reports/<date>/lanes/<lane>.md.
Finish with the message to the orchestrator described in BRIEF.md.
```

How to start them depends on your tooling:

- An agent with a subagent or task tool: start one subagent per lane in a single step so they run at the same time.
- Separate sessions: open one terminal per lane and start an agent in each with the prompt above.
- No agent: run the lane scripts by hand, one lane per terminal.

Lanes share nothing but the target. Each one creates its own accounts with `uniqueEmail()`, so two lanes never log in as the same user. Run at most six lanes at once against a small target.

## While lanes run

- Answer questions from lanes with facts, not guesses. If you do not know, say so and tell the lane to log a `question`.
- Do not move findings between lanes. If a lane reports something outside its scope, leave it under "Seen outside lane".
- Send a progress update every 15 minutes, or when a lane finishes or gets stuck. Keep it to five lines or fewer:

```
QA run 2026-10-13, 25 min in.
Done: a11y, mobile-375. Running: checkout, auth, adversarial, visual-baseline.
So far: 1 blocker, 2 high, 3 a11y, 1 question.
Blocked: none.
Next update at 10:45 or when checkout finishes.
```

Never put secrets, customer data or full repro steps in a progress update.

## Merge

When all lanes are done, or the time box ends, write `reports/<date>/findings.md`.

1. **Collect.** Copy every row from every lane's findings table. Keep the lane id (`CK-3`, `AX-1`). Add a merged id (`F-1`, `F-2`, ...).
2. **De-duplicate.** Two rows are duplicates when they name the same page and the same root cause. Keep one merged row, list all lane ids on it, and take the highest severity any lane gave, unless the re-check below lowers it. Different symptoms of one cause are one finding.
3. **Re-check every blocker and high.** Before you accept one, reproduce it yourself in a fresh browser context with your own script. Save the script and the screenshot under `reports/<date>/scripts/orchestrator/` and `reports/<date>/shots/`. Then mark the row:
   - `confirmed`: you reproduced it.
   - `not reproduced`: you could not. Lower it to `question` and say what you tried.
   - `retracted`: you proved it wrong. Keep the row, give the reason and link the evidence.
4. **Carry retractions over.** A retraction from a lane stays in the merged file with its reason. Never drop a row because it was wrong.
5. **Check single sightings.** A `question` from a lane stays a `question` unless you reproduce it. Do not upgrade it from the lane's description alone.
6. **Score, if you have ground truth.** Against the demo shop, map each merged finding to an id in `demo-shop/SEEDED_BUGS.md` or mark it `false positive`. Report the detection rate as found seeded bugs over total seeded bugs.

## findings.md layout

```
# Findings, <date>

## Summary
<counts by severity, detection rate if scored, lanes run, time taken>

## Findings
| id | lanes | severity | status | page | finding | evidence | maps to |

## Retractions
| id | lane id | original claim | reason | evidence |

## Flow status
<one line per flow, merged from all lanes>

## Questions for the team
<numbered list>
```

## Final message

Send one message at the end, 25 lines or fewer: counts by severity, blockers in one line each, retractions, flows that failed, and the path to `findings.md`. Nothing else.
