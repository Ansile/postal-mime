import { concatChunks } from './decode-strings.js';

const NEWLINE = new Uint8Array([0x0a]);

export default class PassThroughDecoder {
    constructor() {
        this.chunks = [];
    }

    update(line) {
        this.chunks.push(line);
        this.chunks.push(NEWLINE);
    }

    finalize() {
        // release working state: the chunks hold views into the input buffer
        const chunks = this.chunks;
        this.chunks = [];

        return concatChunks(chunks);
    }
}
