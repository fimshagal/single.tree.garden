import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {generateCollatzSequenceAdic} from "./math";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    // outputTrunk();
    // outputScaryPeakAlpha();

    // todo sub-center template

    updateRenderer({
        sequence: generateCollatzSequenceAdic(80).sequence,
        color: 0x7FC248,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(112).sequence,
        color: 0x7FC248,
    });

})();

// 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32