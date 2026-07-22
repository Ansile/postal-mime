import { defineConfig } from 'vitest/config';
import { perfFixturesPlugin } from './fixtures-plugin.js';
import { startCpuProfile, stopCpuProfile } from './browser-commands.js';

export default defineConfig({
    plugins: [perfFixturesPlugin()],
    test: {
        include: ['perf/profile.run.js'],
        testTimeout: 300_000,
        hookTimeout: 120_000,
        browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
            commands: { startCpuProfile, stopCpuProfile }
        }
    }
});
