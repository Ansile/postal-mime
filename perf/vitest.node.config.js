import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // keep the node --test suite invisible to vitest
        include: [],
        benchmark: {
            include: ['perf/**/*.bench.js'],
            outputJson: 'perf/results/raw.node.json'
        },
        testTimeout: 180_000,
        hookTimeout: 120_000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
                execArgv: ['--expose-gc']
            }
        }
    }
});
