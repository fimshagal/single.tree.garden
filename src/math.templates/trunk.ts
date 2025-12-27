import {generateCollatzSequenceAdic} from "../math";
import type {CollatzRendererUpdateConfig} from "../draw";
import {updateRenderer} from "../draw";

/*
    duo skeleton of tree
    base grows: 8 → 32 → 128 → 512 (×4 each group)
    inside each group: base, 1.5×base, 2×base
*/

const groupMultipliers = [2, 3, 4] as const; // divide by 2 => 1×, 1.5×, 2×

export const outputTrunk = (baseLimit?: number, updateHandler?: (config: CollatzRendererUpdateConfig) => void): void => {
    updateHandler = updateHandler ?? updateRenderer;
    baseLimit = baseLimit ?? 8192;

    for (let base: number = 8; base <= baseLimit; base *= 4) {
        for (const m of groupMultipliers) {
            const n: number = (base * m) / 2;
            const color: number = m === 3 ? 0xEA3A13 : 0xA6290D;

            updateHandler({
                sequence: generateCollatzSequenceAdic(n).sequence,
                color,
            });
        }
    }
};