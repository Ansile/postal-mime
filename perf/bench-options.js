// Shared measurement parameters. We drive tinybench by iteration count, not
// by time: large fixtures are macro-benchmarks (hundreds of ms per parse),
// small ones need many samples to beat browser timer quantization (0.1ms).
export const benchOptions = {
    iterations: 10,
    warmupIterations: 3,
    time: 0,
    warmupTime: 0,
    throws: true
};

export const smallBenchOptions = {
    iterations: 300,
    warmupIterations: 30,
    time: 0,
    warmupTime: 0,
    throws: true
};

export function benchOptionsFor(sizeBytes) {
    return sizeBytes < 1024 * 1024 ? smallBenchOptions : benchOptions;
}
