import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Vitest browser commands run on the Node side with access to the Playwright
// page, which lets us drive the CDP profiler for the browser under test.
const profilesDir = fileURLToPath(new URL('./profiles/', import.meta.url));
const cdpSessions = new Map();

export async function startCpuProfile(ctx) {
    const cdp = await ctx.context.newCDPSession(ctx.page);
    cdpSessions.set(ctx.page, cdp);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
}

export async function stopCpuProfile(ctx, label) {
    const cdp = cdpSessions.get(ctx.page);
    if (!cdp) {
        throw new Error('stopCpuProfile called without startCpuProfile');
    }
    cdpSessions.delete(ctx.page);
    const { profile } = await cdp.send('Profiler.stop');
    await cdp.detach();
    await mkdir(profilesDir, { recursive: true });
    await writeFile(`${profilesDir}${label}.cpuprofile`, JSON.stringify(profile));
}
