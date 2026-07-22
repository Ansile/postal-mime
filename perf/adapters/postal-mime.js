// Library adapter: the only postal-mime-specific file in the perf harness.
// To benchmark another EML parser, add a sibling adapter with the same shape.
import PostalMime from '../../src/postal-mime.js';

export default {
    name: 'postal-mime',

    capabilities: {
        attachmentEncodingBase64: true,
        headersOnly: false
    },

    async parse(bytes, options) {
        return PostalMime.parse(bytes, options);
    }
};
