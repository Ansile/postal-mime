// Scenario registry, library-agnostic. A scenario is skipped when the adapter
// does not declare the capability listed in `requires`.
export const scenarios = [
    {
        id: 'parse-default',
        options: {}
    },
    {
        id: 'parse-attach-base64',
        options: { attachmentEncoding: 'base64' },
        requires: 'attachmentEncodingBase64'
    },
    {
        id: 'parse-headers-only',
        options: { headersOnly: true },
        requires: 'headersOnly'
    }
];
