import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {
    outputTrunk,
    outputSubCenters,
    outputScaryPeakAlpha,
    outputSubCentersShoulders, outputSixKPlusFour
} from "./math.templates";
import {generateCollatzSequenceAdic} from "./math";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    // outputSubCentersShoulders();
    // outputSubCenters();
    // outputTrunk();

    // outputScaryPeakAlpha();

    // outputSixKPlusFour(13);
    // outputSixKPlusFour(1, 83);
    outputSixKPlusFour(100, 100);

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(240).sequence,
    //     color: 0xaaccff,
    // });
})();