import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw/v.profile.renderer";
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

    // console.log(generateCollatzSequenceAdic(6, {}, { trackAdic: true }));

    // outputSovereignTrunk();

    const profile = generateCollatzSequenceAdic(1024, {}, { trackAdic: true }).adic.vProfile;

    console.log(profile);

    updateRenderer({
        sequence: profile,
        color: 0x00ffff,
    });

    // outputScaryPeakAlpha();
})();