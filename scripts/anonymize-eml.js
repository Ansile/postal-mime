/* eslint no-console: 0 */
// Light-pass EML anonymizer: byte-length-preserving string replacements.
// Keeps MIME structure, boundaries, encoded bodies and header layout intact,
// so the anonymized file is performance-equivalent to the original.
//
// Usage:
//   node scripts/anonymize-eml.js <input.eml> <output.eml> old=new [old=new ...]

import { readFile, writeFile } from 'node:fs/promises';

function fail(message) {
    console.error(message);
    process.exit(1);
}

const [input, output, ...pairs] = process.argv.slice(2);
if (!input || !output || !pairs.length) {
    fail('Usage: node scripts/anonymize-eml.js <input.eml> <output.eml> old=new [old=new ...]');
}

const replacements = pairs.map(pair => {
    const eq = pair.indexOf('=');
    if (eq < 1) {
        fail(`Invalid replacement pair: ${pair}`);
    }
    const from = pair.slice(0, eq);
    const to = pair.slice(eq + 1);
    if (Buffer.byteLength(from, 'latin1') !== Buffer.byteLength(to, 'latin1')) {
        fail(`Replacement changes byte length: "${from}" (${from.length}) -> "${to}" (${to.length})`);
    }
    return { from, to };
});

const source = await readFile(input);
// latin1 is a 1:1 byte<->char mapping, safe for binary-ish EML content
let content = source.toString('latin1');

for (const { from, to } of replacements) {
    const before = content.split(from).length - 1;
    content = content.split(from).join(to);
    console.log(`replaced "${from}" -> "${to}": ${before} occurrence(s)`);
}

const result = Buffer.from(content, 'latin1');
if (result.length !== source.length) {
    fail(`Size mismatch after anonymization: ${source.length} -> ${result.length}`);
}

await writeFile(output, result);
console.log(`written ${output} (${result.length} bytes, size preserved)`);
