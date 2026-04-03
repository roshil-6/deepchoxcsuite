/** Clamp a number into 0–100 inclusive. */
export function clampScore(n: number): number {
    if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
}

/** Arithmetic mean of values; empty array yields 0. Results clamped 0–100. */
export function average(values: number[]): number {
    if (!values.length) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return clampScore(sum / values.length);
}
