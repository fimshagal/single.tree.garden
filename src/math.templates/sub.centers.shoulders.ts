import type {CollatzRendererUpdateConfig} from "../draw";
import {updateRenderer} from "../draw";
import {generateCollatzSequenceAdic} from "../math";

const shoulderMultipliers = [9, 11, 13, 15] as const;

export const outputSubCentersShoulders = (baseLimit?: number, updateHandler?: (config: CollatzRendererUpdateConfig) => void): void => {
    updateHandler = updateHandler ?? updateRenderer;
    baseLimit = baseLimit ?? 8192;

    for (let n = 3, base = 2 ** n; base <= baseLimit; n++, base *= 2) {
        const pow: number = 2 ** (n - 3);

        for (const m of shoulderMultipliers) {
            const value: number = m * pow;

            updateHandler({
                sequence: generateCollatzSequenceAdic(value).sequence,
                color: 0xffffaa, // m === 11 || m === 15 ? 0x7FC248 : 0xB7855F,
            });
        }
    }
};