import { isBrowser } from './fixtures.js';

// Wraps fn with a V8 CPU profiler and writes a .cpuprofile file (openable in
// Chrome DevTools "Performance > Load profile" and speedscope).
// Node: node:inspector. Browser: CDP via vitest browser commands (Node side).
export async function withCpuProfile(label, fn) {
    if (isBrowser) {
        const { commands } = await import('@vitest/browser/context');
        await commands.startCpuProfile();
        try {
            await fn();
        } finally {
            await commands.stopCpuProfile(`${label}.chromium`);
        }
        return;
    }

    const { Session } = await import('node:inspector/promises');
    const session = new Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: 100 });
    await session.post('Profiler.start');
    try {
        await fn();
    } finally {
        const { profile } = await session.post('Profiler.stop');
        const { mkdir, writeFile } = await import('node:fs/promises');
        const dir = new URL('../profiles/', import.meta.url);
        await mkdir(dir, { recursive: true });
        await writeFile(new URL(`${label}.node.cpuprofile`, dir), JSON.stringify(profile));
        session.disconnect();
    }
}
