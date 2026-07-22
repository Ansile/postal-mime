# perf/ — performance harness

Benchmarks and CPU profiling for postal-mime in Node and headless Chromium.
Methodology (generic, portable to other EML libraries): [docs/performance-testing-plan.md](../docs/performance-testing-plan.md).
Current numbers and optimization proposals: [docs/performance-findings.md](../docs/performance-findings.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm run perf` | bench in Node + Chromium, prints comparison vs committed baselines |
| `npm run perf:node` / `perf:browser` | one environment only |
| `npm run perf:baseline` | run both and overwrite `results/baseline.*.json` |
| `npm run perf:profile` | write `.cpuprofile` files to `profiles/` (node + chromium) |

One-time setup: `npx playwright install chromium`.

Env knobs: `PERF_UPDATE_BASELINE=1` (rewrite baseline), `PERF_ASSERT_PCT=20` (fail run on >20% regression vs baseline).

## Layout

- `adapters/postal-mime.js` — the only library-specific file (`{ name, capabilities, parse }`)
- `scenarios.js` — scenario registry with capability gates
- `parse.bench.js` — fixtures × scenarios bench matrix (vitest bench, tinybench)
- `profile.run.js` — profiling twin of the matrix (plain vitest test, V8 profiler around iterations)
- `harness/` — fixture loading (fs/fetch), profiler dispatch (inspector/CDP)
- `fixtures-plugin.js` — vite middleware serving `fixtures/*` to the browser
- `browser-commands.js` — Node-side CDP profiler for browser runs
- `report.js` — normalizes raw vitest output, compares vs baseline, warns on machine mismatch
- `fixtures/` — committed anonymized EMLs + `manifest.json` (sha256/size); `*.eml` are marked `-text` in `.gitattributes`, do not strip CRLF
- `results/` — `baseline.*.json` committed, `latest.*`/`raw.*` gitignored
- `profiles/` — `.cpuprofile` output (gitignored), open in Chrome DevTools → Performance → Load profile, or speedscope.app

## Notes

- Baselines are machine-specific; `report.js` warns when CPU/OS/runtime differ.
- Profiling runs never update baselines (sampler skews timings).
- Don't name files here `*.test.js` — `node --test` picks them up recursively.
