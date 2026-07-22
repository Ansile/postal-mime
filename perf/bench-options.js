// Shared measurement parameters. Macro-benchmarks (a single parse takes
// hundreds of ms), so we drive tinybench by iteration count, not by time.
export const benchOptions = {
    iterations: 10,
    warmupIterations: 3,
    time: 0,
    warmupTime: 0,
    throws: true
};
