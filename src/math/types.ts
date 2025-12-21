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


export type CollatzResult = {
    sequence: number[];       // (possibly trimmed) sequence including start
    detectedCycle: number[] | null; // minimal detected tail cycle, if any
    steps: number;            // number of transitions performed
    stoppedBecause:
        | "cycle_detected"
        | "max_steps_reached"
        | "non_finite_or_negative";
};