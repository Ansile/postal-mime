import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['perf/profile.run.js'],
        testTimeout: 300_000,
        hookTimeout: 120_000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    }
});
