import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {
    outputTrunk,
    outputSubCenters,
    outputScaryPeakAlpha,
    outputSubCentersShoulders, outputSixKPlusFour,
    outputSovereignTrunk
} from "./math.templates";
import {} from "./math.templates/sovereign.trunk.ts";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    outputSovereignTrunk();

    // outputScaryPeakAlpha();

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(240).sequence,
    //     color: 0xaaccff,
    // });
})();