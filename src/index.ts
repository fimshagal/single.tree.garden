import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer} from "./draw";
import {outputTrunk} from "./math.templates";
import {outputSubCenters} from "./math.templates/sub.centers.ts";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    outputTrunk();
    outputSubCenters();
    // outputScaryPeakAlpha();
})();