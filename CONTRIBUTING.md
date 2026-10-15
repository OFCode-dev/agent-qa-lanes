# Contributing

Run the tests with Node 20 or newer:

```
npm ci
npx playwright install chromium
npm test
```

`npm test` must print `8/8` and `PASS` before you open a pull request.

To add a seeded bug, change three things in one pull request:

1. The code. Plant the bug in `demo-shop/`.
2. The ground truth. Add a row to `demo-shop/SEEDED_BUGS.md` with the next `SB-n` id, page, root cause and file.
3. The smoke check. Add a probe with `record()` in `test/smoke.js` and raise the total in the detection rate line.

The evidence rules in `BRIEF.md` apply to issues too. A bug report needs numbered repro steps and evidence: a screenshot, a script or the exact output. Use the finding template.
