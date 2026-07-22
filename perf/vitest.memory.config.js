import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['perf/memory.run.js'],
        testTimeout: 120_000,
        pool: 'forks',
        maxWorkers: 1
    }
});
