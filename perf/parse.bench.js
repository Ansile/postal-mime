import { bench, describe } from 'vitest';
import adapter from './adapters/postal-mime.js';
import { scenarios } from './scenarios.js';
import { loadFixture, listFixtures } from './harness/fixtures.js';
import { benchOptions } from './bench-options.js';

for (const { name } of listFixtures()) {
    const bytes = await loadFixture(name);

    describe(name, () => {
        for (const scenario of scenarios) {
            if (scenario.requires && !adapter.capabilities[scenario.requires]) {
                continue;
            }
            bench(
                `${name}::${scenario.id}`,
                async () => {
                    await adapter.parse(bytes, scenario.options);
                },
                benchOptions
            );
        }
    });
}
