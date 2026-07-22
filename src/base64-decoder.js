import { decodeBase64Bytes, blobToArrayBuffer } from './decode-strings.js';

// Bytes that belong to the base64 alphabet (padding excluded — decodeBase64Bytes
// derives the tail length from the code count, so '=' carries no information here)
const base64ValidCodes = new Uint8Array(256);
for (let i = 0; i < 64; i++) {
    base64ValidCodes['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i)] = 1;
}

export default class Base64Decoder {
    constructor(opts) {
        opts = opts || {};

        this.maxChunkSize = 100 * 1024;

        this.chunks = [];

        // accumulates raw base64 byte codes across line boundaries
        this.pending = new Uint8Array(this.maxChunkSize);
        this.pendingLen = 0;
    }

    update(buffer) {
        const pending = this.pending;
        const capacity = pending.length;
        let pendingLen = this.pendingLen;

        for (let i = 0; i < buffer.length; i++) {
            const c = buffer[i];
            if (base64ValidCodes[c]) {
                pending[pendingLen++] = c;
                if (pendingLen === capacity) {
                    pendingLen = this.flushDecoded(pendingLen);
                }
            }
        }

        this.pendingLen = pendingLen;
    }

    // decodes the 4-aligned prefix of pending, keeps the 0-3 byte tail
    flushDecoded(pendingLen) {
        const usable = pendingLen - (pendingLen % 4);
        if (!usable) {
            return pendingLen;
        }

        this.chunks.push(decodeBase64Bytes(this.pending, usable));

        const tail = pendingLen - usable;
        for (let i = 0; i < tail; i++) {
            this.pending[i] = this.pending[usable + i];
        }
        return tail;
    }

    finalize() {
        if (this.pendingLen) {
            this.chunks.push(decodeBase64Bytes(this.pending, this.pendingLen));
            this.pendingLen = 0;
        }

        return blobToArrayBuffer(new Blob(this.chunks, { type: 'application/octet-stream' }));
    }
}
