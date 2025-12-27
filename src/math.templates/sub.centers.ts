import type {CollatzRendererUpdateConfig} from "../draw";
import {updateRenderer} from "../draw";
import {generateCollatzSequenceAdic} from "../math";

export const outputSubCenters = (baseLimit?: number, updateHandler?: (config: CollatzRendererUpdateConfig) => void): void => {
    updateHandler = updateHandler ?? updateRenderer;
    baseLimit = baseLimit ?? 8192;

    for (let n = 2, base = 2 ** n; base <= baseLimit; n++, base *= 2) {
        const left: number = 5 * 2 ** (n - 2);
        const right: number = 7 * 2 ** (n - 2);

        updateHandler({
            sequence: generateCollatzSequenceAdic(left).sequence,
            color: 0x8EF213,
        });

        updateHandler({
            sequence: generateCollatzSequenceAdic(right).sequence,
            color: 0x13BEF2,
        });
    }
};