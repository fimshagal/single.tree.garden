import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer} from "./draw";
import {outputTrunk, outputFiveFriendly} from "./math.templates";

(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    outputTrunk();
    outputFiveFriendly();

    // 19- -29

    // 36-40- -56-60
})();