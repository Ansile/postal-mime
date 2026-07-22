import { defineConfig } from 'vitest/config';
import { perfFixturesPlugin } from './fixtures-plugin.js';

export default defineConfig({
    plugins: [perfFixturesPlugin()],
    test: {
        include: [],
        benchmark: {
            include: ['perf/**/*.bench.js'],
            outputJson: 'perf/results/raw.chromium.json'
        },
        testTimeout: 180_000,
        hookTimeout: 120_000,
        browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
        }
    }
});
