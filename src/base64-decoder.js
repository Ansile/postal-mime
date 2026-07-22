import { decodeBase64Bytes, concatChunks } from './decode-strings.js';

// Bytes that belong to the base64 alphabet (padding excluded — decodeBase64Bytes
// derives the tail length from the code count, so '=' carries no information here)
const base64ValidCodes = new Uint8Array(256);
for (let i = 0; i < 64; i++) {
    base64ValidCodes['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i)] = 1;
}

const INITIAL_PENDING_SIZE = 4 * 1024;

export default class Base64Decoder {
    constructor(opts) {
        opts = opts || {};

        this.maxChunkSize = 100 * 1024;

        this.chunks = [];

        // accumulates raw base64 byte codes across line boundaries;
        // allocated lazily and grown on demand — a parser can hold thousands
        // of finalized nodes, each with its own decoder instance
        this.pending = null;
        this.pendingLen = 0;
    }

    // grows pending (up to maxChunkSize) preserving accumulated bytes
    growPending(desiredCapacity) {
        let size = this.pending ? this.pending.length * 2 : INITIAL_PENDING_SIZE;
        while (size < desiredCapacity && size < this.maxChunkSize) {
            size *= 2;
        }
        size = Math.min(size, this.maxChunkSize);

        const next = new Uint8Array(size);
        if (this.pendingLen) {
            next.set(this.pending.subarray(0, this.pendingLen));
        }
        this.pending = next;
    }

    update(buffer) {
        const len = buffer.length;

        // fast path: a body line is almost always pure base64, so a read-only
        // validity scan + bulk copy beats the filtering per-byte writes
        let allValid = true;
        for (let i = 0; i < len; i++) {
            if (!base64ValidCodes[buffer[i]]) {
                allValid = false;
                break;
            }
        }

        if (allValid) {
            let offset = 0;
            while (offset < len) {
                const capacity = this.pending ? this.pending.length : 0;
                if (this.pendingLen === capacity) {
                    if (capacity < this.maxChunkSize) {
                        this.growPending(this.pendingLen + (len - offset));
                    } else {
                        this.pendingLen = this.flushDecoded(this.pendingLen);
                    }
                }
                const space = this.pending.length - this.pendingLen;
                const take = len - offset <= space ? len - offset : space;
                this.pending.set(offset === 0 && take === len ? buffer : buffer.subarray(offset, offset + take), this.pendingLen);
                this.pendingLen += take;
                offset += take;
            }
            return;
        }

        for (let i = 0; i < len; i++) {
            const c = buffer[i];
            if (!base64ValidCodes[c]) {
                continue;
            }
            if (this.pendingLen === (this.pending ? this.pending.length : 0)) {
                if (!this.pending || this.pending.length < this.maxChunkSize) {
                    this.growPending(this.pendingLen + 1);
                } else {
                    this.pendingLen = this.flushDecoded(this.pendingLen);
                }
            }
            this.pending[this.pendingLen++] = c;
        }
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
        }

        // release working state: the decoder instance stays referenced
        // by its MIME node for as long as the parser is alive
        const chunks = this.chunks;
        this.pending = null;
        this.pendingLen = 0;
        this.chunks = [];

        return concatChunks(chunks);
    }
}
