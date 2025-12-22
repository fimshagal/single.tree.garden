import type {CollatzParams, CollatzResult, SequenceParams, SequenceTrimResult} from "./types.ts";

const findTailCycle = <T>(arr: T[]): T[] | null => {
    const n = arr.length;
    if (n < 2) return null;

    for (let k = 1; k <= Math.floor(n / 2); k++) {

        let ok = true;
        for (let i = 0; i < k; i++) {
            if (arr[n - 1 - i] !== arr[n - 1 - i - k]) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;

        return arr.slice(n - k);
    }

    return null;
}

const trimToLastTailCycle = <T>(arr: T[]): SequenceTrimResult<T> => {
    const cycle = findTailCycle(arr);
    if (!cycle) return { trimmed: arr.slice(), cycle: null };

    const k = cycle.length;
    let i = arr.length;

    while (i >= k) {
        const block = arr.slice(i - k, i);
        let same = true;
        for (let j = 0; j < k; j++) {
            if (block[j] !== cycle[j]) {
                same = false;
                break;
            }
        }
        if (!same) break;
        i -= k;
    }

    const trimmed = [...arr.slice(0, i), ...cycle];
    return { trimmed, cycle };
}

const collatzStep = (current: number, divisor: number, multiplier: number, increment: number): number => {
    if (current % divisor === 0) return current / divisor;
    return multiplier * current + increment;
}

export const generateCollatzSequence = (
    startValue: number,
    {
        divisor = 2,
        multiplier = 3,
        increment = 1,
    }: CollatzParams = {},
    {
        maxSteps = 50_000,
        maxTail = 2_000,    // keep only last maxTail values in memory while running
        autoTrimTail = true // trim repeated tail cycles to a single last occurrence
    }: SequenceParams = {}
): CollatzResult => {
    if (!Number.isFinite(startValue) || startValue <= 0) {
        return {
            sequence: [startValue],
            detectedCycle: null,
            steps: 0,
            stoppedBecause: "non_finite_or_negative",
        };
    }
    if (divisor <= 1) throw new Error("divisor must be >= 2");
    if (!Number.isFinite(multiplier) || !Number.isFinite(increment)) {
        throw new Error("multiplier/increment must be finite numbers");
    }

    const seq: number[] = [startValue];
    let detectedCycle: number[] | null = null;

    for (let steps = 0; steps < maxSteps; steps++) {
        const current = seq.at(-1);

        if (!current) {
            return {
                sequence: seq,
                detectedCycle,
                steps,
                stoppedBecause: "non_finite_or_negative",
            };
        }

        const next: number = collatzStep(current, divisor, multiplier, increment);

        if (!Number.isFinite(next) || next <= 0) {
            return {
                sequence: seq,
                detectedCycle,
                steps,
                stoppedBecause: "non_finite_or_negative",
            };
        }

        seq.push(next);

        // Keep memory bounded (still enough for tail-cycle detection).
        if (seq.length > maxTail) {
            seq.splice(0, seq.length - maxTail);
        }

        // Detect tail cycle and stop.
        // (We check after each append; you can also check every K steps if you want.)
        detectedCycle = findTailCycle(seq);
        if (detectedCycle) {
            const out = autoTrimTail ? trimToLastTailCycle(seq).trimmed : seq.slice();
            return {
                sequence: out,
                detectedCycle,
                steps: steps + 1,
                stoppedBecause: "cycle_detected",
            };
        }
    }

    return {
        sequence: autoTrimTail ? trimToLastTailCycle(seq).trimmed : seq.slice(),
        detectedCycle,
        steps: maxSteps,
        stoppedBecause: "max_steps_reached",
    };
}
