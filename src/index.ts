import {generateCollatzSequenceAdic} from "./math";
import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    // duo skeleton of tree
    // base grows: 8 → 32 → 128 → 512 (×4 each group)
    // inside each group: base, 1.5×base, 2×base
    const groupMultipliers = [2, 3, 4] as const; // divide by 2 => 1×, 1.5×, 2×

    for (let base = 8; base <= 8192; base *= 4) {
        for (const m of groupMultipliers) {
            const n = (base * m) / 2;
            const color = m === 3 ? 0x7FC248 : 0xB7855F;

            updateRenderer({
                sequence: generateCollatzSequenceAdic(n).sequence,
                color,
            });
        }
    }

    updateRenderer({
        sequence: generateCollatzSequenceAdic(32).sequence,
        color: 0xff0000,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(64).sequence,
        color: 0xff0000,
    });
})();