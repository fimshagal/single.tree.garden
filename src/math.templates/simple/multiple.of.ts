import type {CollatzRendererUpdateConfig} from "../../draw/simple.renderer/types.ts";
import {updateRenderer} from "../../draw/simple.renderer";
import {generateCollatzSequenceAdic} from "../../math";

export const outputMultipleOf = (multiplier?: number, from?: number, to?: number, updateHandler?: (config: CollatzRendererUpdateConfig) => void): void => {
    multiplier = multiplier ?? 1;
    updateHandler = updateHandler ?? updateRenderer;
    from = from ?? 1;
    to = to ?? from + 1;

    for (let i: number = from; i <= to; i++) {
        const n: number = i * multiplier;

        updateHandler({
            sequence: generateCollatzSequenceAdic(n).sequence,
            color: 0x7FC248,
        });
    }
};