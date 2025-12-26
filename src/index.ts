import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer} from "./draw";
import {outputTrunk, outputMultipleOf} from "./math.templates";
import {outputScaryPeakAlpha} from "./math.templates/scary.peak.alpha.ts";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    // outputTrunk();

    outputScaryPeakAlpha();

    // 19- -29
    // 36-40- -56-60
})();