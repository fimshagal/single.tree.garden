import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {outputTrunk} from "./math.templates";
import {outputSubCenters} from "./math.templates/sub.centers.ts";
import {generateCollatzSequenceAdic} from "./math";
import {outputScaryPeakAlpha} from "./math.templates/scary.peak.alpha.ts";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    outputTrunk();
    outputSubCenters();

    console.log(generateCollatzSequenceAdic(3456).sequence);
    // outputScaryPeakAlpha();

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(72).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(88).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(104).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(120).sequence,
    //     color: 0xffffff,
    // });
    //
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(144).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(176).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(208).sequence,
    //     color: 0xffffff,
    // });
    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(240).sequence,
    //     color: 0xffffff,
    // });
})();