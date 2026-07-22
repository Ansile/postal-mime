// Fixture loading that works both in Node and in Vitest Browser Mode.
// In the browser, fixtures are served by the middleware registered in the
// vitest browser config (see perfFixturesPlugin).
import manifest from '../fixtures/manifest.json';

export const isBrowser = typeof window !== 'undefined';

export function listFixtures() {
    return Object.entries(manifest.fixtures).map(([name, meta]) => ({ name, ...meta }));
}

export async function loadFixture(name) {
    const meta = manifest.fixtures[name];
    if (!meta) {
        throw new Error(`Unknown fixture: ${name}`);
    }

    let bytes;
    if (isBrowser) {
        const res = await fetch(`/__perf_fixtures__/${name}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch fixture ${name}: ${res.status}`);
        }
        bytes = new Uint8Array(await res.arrayBuffer());
    } else {
        const { readFile } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
        bytes = new Uint8Array(await readFile(path));
    }

    if (bytes.length !== meta.sizeBytes) {
        throw new Error(`Fixture ${name} size mismatch: expected ${meta.sizeBytes}, got ${bytes.length}`);
    }
    return bytes;
}
