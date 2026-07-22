// Code from: https://gist.githubusercontent.com/jonleighton/958841/raw/fb05a8632efb75d85d43deb593df04367ce48371/base64ArrayBuffer.js

// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5

/*
MIT LICENSE

Copyright 2011 Jon Leighton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// ASCII codes of the base64 alphabet
const encodingCodes = new Uint8Array(64);
for (let i = 0; i < 64; i++) {
    encodingCodes[i] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i);
}
const PADDING_CODE = 0x3d; // '='

const asciiDecoder = new TextDecoder();

export function base64ArrayBuffer(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    var byteLength = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength = byteLength - byteRemainder;

    // Encode into a preallocated byte buffer: string concatenation in this
    // loop generates gigabytes of garbage on multi-megabyte attachments
    var out = new Uint8Array(byteRemainder ? ((mainLength / 3) + 1) * 4 : (mainLength / 3) * 4);
    var pos = 0;

    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        out[pos++] = encodingCodes[(chunk & 16515072) >> 18]; // 16515072 = (2^6 - 1) << 18
        out[pos++] = encodingCodes[(chunk & 258048) >> 12]; // 258048   = (2^6 - 1) << 12
        out[pos++] = encodingCodes[(chunk & 4032) >> 6]; // 4032     = (2^6 - 1) << 6
        out[pos++] = encodingCodes[chunk & 63]; // 63       = 2^6 - 1
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength];

        out[pos++] = encodingCodes[(chunk & 252) >> 2]; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        out[pos++] = encodingCodes[(chunk & 3) << 4]; // 3   = 2^2 - 1

        out[pos++] = PADDING_CODE;
        out[pos++] = PADDING_CODE;
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        out[pos++] = encodingCodes[(chunk & 64512) >> 10]; // 64512 = (2^6 - 1) << 10
        out[pos++] = encodingCodes[(chunk & 1008) >> 4]; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        out[pos++] = encodingCodes[(chunk & 15) << 2]; // 15    = 2^4 - 1

        out[pos++] = PADDING_CODE;
    }

    return asciiDecoder.decode(out);
}
