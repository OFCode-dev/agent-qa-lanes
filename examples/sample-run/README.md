# Sample run

This is a synthetic run against the demo shop. I wrote it by hand to show what lane output and a merged file look like. No real system was tested.

## Files

- `lanes/checkout.md`, `lanes/a11y.md`, `lanes/adversarial.md`: three lane reports in the format from `BRIEF.md`.
- `merged.md`: the orchestrator's merged file. In a real run it is `reports/<date>/findings.md`.
- `scripts/orchestrator/recheck-ck1.js`: the re-check that disproved CK-1. It is a real script. Start the demo with `npm run demo`, then run `node examples/sample-run/scripts/orchestrator/recheck-ck1.js`.

Screenshots and the lane scripts named in the evidence columns are not committed. Run `npm test` or the re-check script to produce real screenshots under `reports/`.

## What to look at

- **The retraction.** The checkout lane called "Check delivery options" dead (CK-1). The orchestrator re-checked it, found the dialog at the end of the DOM, below the fold, and retracted the claim. The row stays in the lane file and in the merged file with the reason.
- **De-duplication.** The checkout and a11y lanes both found the mouse-only date picker (CK-3, AX-3). The merged file has one row, F-3, with both lane ids.
- **Ground truth.** Every merged row maps to an id in `demo-shop/SEEDED_BUGS.md` or is marked `false positive`. The run found 7 of 8 seeded bugs. It missed SB-8 because the mobile-375 lane did not run.
