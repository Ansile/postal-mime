// Profiling runs are separate from bench runs: the profiler skews timings,
// so these tests produce .cpuprofile files and no timing results.
import { describe, test } from 'vitest';
import adapter from './adapters/postal-mime.js';
import { scenarios } from './scenarios.js';
import { loadFixture, listFixtures } from './harness/fixtures.js';
import { withCpuProfile } from './harness/profiler.js';

const PROFILE_ITERATIONS = 5;

for (const { name } of listFixtures()) {
    describe(name, () => {
        for (const scenario of scenarios) {
            if (scenario.requires && !adapter.capabilities[scenario.requires]) {
                continue;
            }
            test(`profile ${name}::${scenario.id}`, async () => {
                const bytes = await loadFixture(name);
                // one warmup pass outside the profile
                await adapter.parse(bytes, scenario.options);
                const label = `${name.replace(/\.eml$/, '')}.${scenario.id}`;
                await withCpuProfile(label, async () => {
                    for (let i = 0; i < PROFILE_ITERATIONS; i++) {
                        await adapter.parse(bytes, scenario.options);
                    }
                });
            });
        }
    });
}
