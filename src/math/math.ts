import type {AdicDebug, CollatzParams, CollatzResult, TraceMode} from "./types.ts";

/** v2(x): exponent of 2 in x (how many times divisible by 2). Assumes x is a positive safe integer. */
const v2 = (x: number): number => {
    let k: number = 0;
    while ((x & 1) === 0) { // works reliably while x is within 32-bit. For big numbers use (x % 2 === 0).
        x = x / 2;
        k++;
    }
    return k;
};

/** Safer v2 for JS numbers (works beyond 32-bit, slower). */
const v2Safe = (x: number): number => {
    let k: number = 0;
    while (x % 2 === 0) {
        x = x / 2;
        k++;
    }
    return k;
};

/** One FULL generalized Collatz step (your current behavior). */
const collatzStepFull = (n: number, d: number, q: number, t: number): number => {
    return n % d === 0 ? n / d : q * n + t;
}

/**
 * One ODD-ONLY step (accelerated):
 * - expects n is odd positive integer
 * - computes a = q*n + t
 * - strips all factors of 2: n' = a / 2^k, where k = v2(a)
 * - returns { nextOdd, k }
 */
const collatzStepOddOnly = (nOdd: number, q: number, t: number): { nextOdd: number; k: number } => {
    const a: number = q * nOdd + t;
    if (!Number.isSafeInteger(a) || a <= 0) return { nextOdd: a, k: 0 };

    const k: number = v2Safe(a);
    return { nextOdd: a / 2 ** k, k };
}

/** Detect cycle by first repeated "state key" (classic tortoise-map but using Map index). */
const detectCycleByStatePush = (
    seen: Map<string, number>,
    key: string,
    index: number
): { startIndex: number; length: number; stateKey: string } | null => {
    const prev: number = seen.get(key);
    if (prev) {
        return { startIndex: prev, length: index - prev, stateKey: key };
    }
    seen.set(key, index);
    return null;
}

export const generateCollatzSequenceAdic = (
    startValue: number,
    {
        divisor = 2,
        multiplier = 3,
        increment = 1,
    }: CollatzParams = {},
    {
        maxSteps = 200_000,
        mode = "full" as TraceMode,

        // For adic diagnostics:
        trackAdic = true,
        residueBits = [8, 12, 16], // track n mod 2^b
        stopOnStateCycle = true,    // stop immediately if state repeats
    }: {
        maxSteps?: number;
        mode?: TraceMode;

        trackAdic?: boolean;
        residueBits?: number[];
        stopOnStateCycle?: boolean;
    } = {}
): CollatzResult => {
    if (!Number.isFinite(startValue) || startValue <= 0) {
        return { sequence: [startValue], steps: 0, stoppedBecause: "nonFiniteOrNegative", detectedCycle: null };
    }

    const seq: number[] = [startValue];

    // adic tracking
    const kProfile: number[] = [];
    const residues: number[][] | undefined = trackAdic
        ? residueBits.map(() => [])
        : undefined;

    const seen = new Map<string, number>(); // key -> index in seq
    const makeResidueKey = (n: number) =>
        residueBits
            .map((b) => {
                const mod = 2 ** b;
                return (n % mod + mod) % mod; // safe for positive n
            })
            .join("|");

    const pushResidues = (n: number) => {
        if (!residues) return;
        for (let i = 0; i < residueBits.length; i++) {
            const mod = 2 ** residueBits[i];
            residues[i].push(n % mod);
        }
    };

    // init
    pushResidues(startValue);

    // seed "state cycle" detection
    if (stopOnStateCycle) {
        const key =
            mode === "oddOnly"
                ? `odd:${startValue % 2 === 0 ? startValue / 2 : startValue}` // not perfect; see below
                : `n:${startValue}|r:${makeResidueKey(startValue)}`;
        seen.set(key, 0);
    }

    let cycleByState: AdicDebug["cycleByState"] = null;

    // If odd_only mode, normalize start to odd (like classic accelerated Collatz)
    let current = startValue;
    if (mode === "oddOnly") {
        while (current % 2 === 0) current /= 2;
        seq[0] = current;
    }

    for (let steps = 0; steps < maxSteps; steps++) {
        let next: number;

        if (mode === "full") {
            next = collatzStepFull(current, divisor, multiplier, increment);
        } else {
            // odd-only
            const { nextOdd, k } = collatzStepOddOnly(current, multiplier, increment);
            kProfile.push(k);
            next = nextOdd;
        }

        if (!Number.isFinite(next) || next <= 0) {
            return {
                sequence: seq,
                steps,
                stoppedBecause: "nonFiniteOrNegative",
                detectedCycle: null,
                adic: trackAdic
                    ? { mode, kProfile, residues, cycleByState }
                    : undefined,
            };
        }

        current = next;
        seq.push(current);
        pushResidues(current);

        if (stopOnStateCycle) {
            // Choose a "state key" depending on what you want to prove.
            // For 2-adic stability, residue key is gold.
            // For true numeric cycle, use just n.
            const key =
                mode === "oddOnly"
                    ? `odd:${current}` // odd-only already normalized
                    : `n:${current}|r:${makeResidueKey(current)}`;

            const cyc = detectCycleByStatePush(seen, key, seq.length - 1);
            if (cyc) {
                cycleByState = cyc;
                const detectedCycle = seq.slice(cyc.startIndex);
                return {
                    sequence: seq,
                    steps: steps + 1,
                    stoppedBecause: "cycleDetected",
                    detectedCycle,
                    adic: trackAdic
                        ? { mode, kProfile, residues, cycleByState }
                        : undefined,
                };
            }
        }
    }

    return {
        sequence: seq,
        steps: maxSteps,
        stoppedBecause: "maxStepsReached",
        detectedCycle: null,
        adic: trackAdic ? { mode, kProfile, residues, cycleByState } : undefined,
    };
};