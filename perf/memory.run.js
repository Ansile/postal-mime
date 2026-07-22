// Retained-memory regression tests (node-only). Guards against decoders
// holding onto working buffers: both while the parser/node tree is alive
// (peak during parse) and via the returned result.
import { describe, test, expect } from 'vitest';
import v8 from 'node:v8';
import vm from 'node:vm';
import PostalMime from '../src/postal-mime.js';
import { loadFixture } from './harness/fixtures.js';

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');

const MB = 1024 * 1024;

function heapNow() {
    const m = process.memoryUsage();
    return m.heapUsed + m.arrayBuffers;
}

async function settleGc() {
    gc();
    await new Promise(resolve => setTimeout(resolve, 20));
    gc();
}

function fmt(bytes) {
    return `${(bytes / MB).toFixed(1)}MB`;
}

// Measures two retained values:
// - whileParserAlive: after parse, parser (and its MIME node tree with
//   decoders) still referenced — this approximates peak memory during parse
// - resultOnly: parser released, only the returned message kept
async function measureRetained(bytes, options) {
    await settleGc();
    const before = heapNow();

    let parser = new PostalMime(options);
    const result = await parser.parse(bytes);

    await settleGc();
    const whileParserAlive = heapNow() - before;

    parser = null;
    await settleGc();
    const resultOnly = heapNow() - before;

    return { whileParserAlive, resultOnly, attachmentCount: result.attachments.length };
}

// multipart/mixed with many tiny base64 attachments: worst case for
// per-node decoder state (each MIME node gets its own Base64Decoder)
function buildManySmallBase64Parts(partCount) {
    const boundary = 'memtest-boundary';
    const lines = ['From: a@example.com', 'Subject: memory test', 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, ''];
    for (let i = 0; i < partCount; i++) {
        lines.push(
            `--${boundary}`,
            'Content-Type: application/octet-stream',
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="part-${i}.bin"`,
            '',
            'QUJDREVGR0hJSktMTU5PUA==', // 16 bytes decoded
            ''
        );
    }
    lines.push(`--${boundary}--`, '');
    return new TextEncoder().encode(lines.join('\r\n'));
}

describe('retained memory after parse', () => {
    test('many small base64 parts do not amplify memory while parsing', async () => {
        const partCount = 3000;
        const bytes = buildManySmallBase64Parts(partCount);
        const { whileParserAlive, resultOnly, attachmentCount } = await measureRetained(bytes);

        // budget: inherent MimeNode overhead is ~3KB per node (headers,
        // decoder object, attachment entry) — allow 4KB/node; catches
        // decoders retaining fixed working buffers (100KB/node = 300MB here)
        const limit = partCount * 4096 + 2 * MB;
        const report = `many-small-parts: input ${fmt(bytes.length)}, retained while parser alive ${fmt(whileParserAlive)}, result-only ${fmt(resultOnly)}, limit ${fmt(limit)}`;
        process.stdout.write(report + '\n');

        expect(attachmentCount).toBe(3000);
        expect(whileParserAlive, report).toBeLessThan(limit);
        expect(resultOnly, report).toBeLessThan(limit);
    });

    test('large email memory stays proportional to input', async () => {
        const bytes = await loadFixture('full.eml');
        const { whileParserAlive, resultOnly } = await measureRetained(bytes);

        const limit = bytes.length * 3;
        const report = `full.eml: input ${fmt(bytes.length)}, retained while parser alive ${fmt(whileParserAlive)}, result-only ${fmt(resultOnly)}, limit ${fmt(limit)}`;
        process.stdout.write(report + '\n');

        expect(whileParserAlive, report).toBeLessThan(limit);
    });

    test('base64 attachmentEncoding memory stays proportional', async () => {
        const bytes = await loadFixture('full.eml');
        const { whileParserAlive } = await measureRetained(bytes, { attachmentEncoding: 'base64' });

        // base64 strings are ~1.33x the binary size, allow headroom
        const limit = bytes.length * 4;
        const report = `full.eml (base64 encoding): input ${fmt(bytes.length)}, retained while parser alive ${fmt(whileParserAlive)}, limit ${fmt(limit)}`;
        process.stdout.write(report + '\n');

        expect(whileParserAlive, report).toBeLessThan(limit);
    });
});
