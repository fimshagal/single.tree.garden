export type CollatzParams = {
    divisor?: number;      // d, default 2
    multiplier?: number;   // q, default 3
    increment?: number;    // t, default 1
};

export type SequenceParams = {
    maxSteps?: number;
    maxTail?: number;
    autoTrimTail?: boolean;
};

export type SequenceTrimResult<T> = {
    trimmed: T[];
    cycle: T[] | null;
};

type StoppedBecause = "cycleDetected" | "maxStepsReached" | "nonFiniteOrNegative";

export type TraceMode = "full" | "oddOnly";

export interface VProfile {
    v2: number;
    v3: number;
}

export type AdicDebug = {
    mode: TraceMode;

    // 2-adic profile: on each odd-step we record k = v2(q*n + t)
    kProfile: number[];
    vProfile: VProfile[];

    // residues: n mod 2^b for each step (optional, can be heavy)
    residues?: number[][]; // residues[bIndex][step] = residue

    // cycle info by state repeat (stronger than tail periodicity)
    cycleByState:
        | null
        | {
        startIndex: number;   // index where cycle starts in produced sequence
        length: number;       // cycle length
        stateKey: string;     // repeated state key
    };
};


export type CollatzResult = {
    sequence: number[];
    steps: number;
    stoppedBecause: StoppedBecause;
    detectedCycle: number[] | null;
    adic?: AdicDebug;
};