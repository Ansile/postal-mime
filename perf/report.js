/* eslint no-console: 0 */
// Normalizes a raw vitest bench JSON report into the harness result schema,
// writes latest.<env>.json, compares against the committed baseline and
// optionally (PERF_UPDATE_BASELINE=1) updates it.
//
// Usage: node perf/report.js <node|chromium>

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const env = process.argv[2];
if (!['node', 'chromium'].includes(env)) {
    console.error('Usage: node perf/report.js <node|chromium>');
    process.exit(1);
}

const perfDir = fileURLToPath(new URL('.', import.meta.url));
const resolve = rel => new URL(rel, import.meta.url);

const manifest = JSON.parse(await readFile(resolve('./fixtures/manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(resolve('../package.json'), 'utf8'));

function tryExec(command) {
    try {
        return execSync(command, { cwd: perfDir, encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

async function runtimeVersion() {
    if (env === 'node') {
        return `node ${process.version}`;
    }
    try {
        const browsers = JSON.parse(await readFile(resolve('../node_modules/playwright-core/browsers.json'), 'utf8'));
        const chromium = browsers.browsers.find(b => b.name === 'chromium');
        return `chromium ${chromium.browserVersion} (playwright ${pkg.devDependencies.playwright})`;
    } catch {
        return `chromium (playwright ${pkg.devDependencies.playwright})`;
    }
}

const raw = JSON.parse(await readFile(resolve(`./results/raw.${env}.json`), 'utf8'));

const results = [];
for (const file of raw.files) {
    for (const group of file.groups) {
        for (const b of group.benchmarks) {
            const [fixture, scenario] = b.name.split('::');
            const fixtureMeta = manifest.fixtures[fixture];
            results.push({
                scenario,
                fixture,
                iterations: b.sampleCount,
                medianMs: round(b.median),
                meanMs: round(b.mean),
                minMs: round(b.min),
                maxMs: round(b.max),
                p99Ms: round(b.p99),
                stddevMs: round(b.sd),
                rmePct: round(b.rme),
                mbps: fixtureMeta && b.median > 0 ? round(fixtureMeta.sizeBytes / 1024 / 1024 / (b.median / 1000)) : null
            });
        }
    }
}
results.sort((a, b) => a.fixture.localeCompare(b.fixture) || a.scenario.localeCompare(b.scenario));

const report = {
    meta: {
        lib: pkg.name,
        libVersion: pkg.version,
        env,
        runtimeVersion: await runtimeVersion(),
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        cpu: os.cpus()[0]?.model || 'unknown',
        gitSha: (() => {
            const sha = tryExec('git rev-parse --short HEAD');
            if (!sha) {
                return null;
            }
            // a dirty tree means the sha cannot reproduce this measurement
            return tryExec('git status --porcelain') ? `${sha}-dirty` : sha;
        })(),
        date: new Date().toISOString()
    },
    fixtures: manifest.fixtures,
    results
};

function round(value) {
    return value == null ? null : Math.round(value * 100) / 100;
}

await mkdir(resolve('./results'), { recursive: true });

const profiling = process.env.PERF_PROFILE === '1';
if (profiling) {
    console.log('PERF_PROFILE=1: profiling run, results are skewed — not writing latest/baseline');
    process.exit(0);
}

await writeFile(resolve(`./results/latest.${env}.json`), JSON.stringify(report, null, 4) + '\n');

let baseline = null;
try {
    baseline = JSON.parse(await readFile(resolve(`./results/baseline.${env}.json`), 'utf8'));
} catch {
    // no baseline yet
}

if (baseline) {
    const sameMachine = baseline.meta.cpu === report.meta.cpu && baseline.meta.os === report.meta.os && baseline.meta.runtimeVersion === report.meta.runtimeVersion;
    if (!sameMachine) {
        console.warn('⚠️  Baseline was recorded on a different machine/runtime — deltas are not meaningful:');
        console.warn(`   baseline: ${baseline.meta.cpu} | ${baseline.meta.os} | ${baseline.meta.runtimeVersion}`);
        console.warn(`   current:  ${report.meta.cpu} | ${report.meta.os} | ${report.meta.runtimeVersion}`);
    }
}

const assertPct = Number(process.env.PERF_ASSERT_PCT) || 0;
let failed = false;

console.log(`\n[${env}] ${report.meta.runtimeVersion} | lib ${report.meta.lib}@${report.meta.libVersion}`);
const rows = results.map(r => {
    const base = baseline?.results.find(b => b.fixture === r.fixture && b.scenario === r.scenario);
    const delta = base && base.medianMs > 0 ? ((r.medianMs - base.medianMs) / base.medianMs) * 100 : null;
    if (assertPct && delta != null && delta > assertPct) {
        failed = true;
    }
    return {
        fixture: r.fixture,
        scenario: r.scenario,
        'median ms': r.medianMs,
        'p99 ms': r.p99Ms,
        'MB/s': r.mbps,
        'vs baseline': delta == null ? '—' : `${delta > 0 ? '+' : ''}${round(delta)}%`
    };
});
console.table(rows);

if (process.env.PERF_UPDATE_BASELINE === '1') {
    await writeFile(resolve(`./results/baseline.${env}.json`), JSON.stringify(report, null, 4) + '\n');
    console.log(`baseline.${env}.json updated`);
}

if (failed) {
    console.error(`Regression above PERF_ASSERT_PCT=${assertPct}% detected`);
    process.exit(1);
}
