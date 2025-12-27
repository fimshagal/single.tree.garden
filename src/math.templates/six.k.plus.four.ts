import type {CollatzRendererUpdateConfig} from "../draw";
import {updateRenderer} from "../draw";
import {generateCollatzSequenceAdic} from "../math";

// result very near to scary.peak.alpha.ts

export const outputSixKPlusFour = (
    count?: number,
    startFrom?: number,
    updateHandler?: (config: CollatzRendererUpdateConfig) => void
): void => {
    updateHandler = updateHandler ?? updateRenderer;
    count = count ?? 100;
    startFrom = startFrom ?? 1;

    let found = 0;

    // pick initial n so that 2^(n-1) < startFrom <= 2^n
    let n = Math.max(1, Math.ceil(Math.log2(Math.max(1, startFrom))));

    while (found < count) {
        const low = 2 ** (n - 1);
        const high = 2 ** n;

        // safety guard for JS numbers
        if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high)) break;

        // range is (low, high], but also respect startFrom for the first (and subsequent) ranges
        const start = Math.max(low + 1, Math.floor(startFrom));

        // first x >= start with x ≡ 4 (mod 6)
        const mod = ((start % 6) + 6) % 6;
        const delta = (4 - mod + 6) % 6;

        for (let x = start + delta; x <= high && found < count; x += 6) {
            updateHandler({
                sequence: generateCollatzSequenceAdic(x).sequence,
                color: 0x7FC248,
            });
            found++;
        }
        n++;
    }
};