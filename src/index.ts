import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw/simple.renderer";
import {
    outputTrunk,
    outputSubCenters,
    outputScaryPeakAlpha,
    outputSubCentersShoulders, outputSixKPlusFour,
    outputSovereignTrunk
} from "./math.templates/simple";
import {generateCollatzSequenceAdic} from "./math";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    console.log(generateCollatzSequenceAdic(6, {}, { trackAdic: true }));

    // outputSovereignTrunk();

    updateRenderer({
        sequence: generateCollatzSequenceAdic(40).sequence,
        color: 0x00ffff,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(80).sequence,
        color: 0x00ffcc,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(160).sequence,
        color: 0x00ffaa,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(320).sequence,
        color: 0x00ff77,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(640).sequence,
        color: 0x00ff44,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(1280).sequence,
        color: 0x00ff11,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(54).sequence,
        color: 0xa122a0,
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(16063).sequence,
        color: 0xff0000,
    });

    // outputScaryPeakAlpha();
})();