import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw/v.profile.renderer";
import {
    outputTrunk,
    outputSubCenters,
    outputScaryPeakAlpha,
    outputSubCentersShoulders, outputSixKPlusFour,
    outputSovereignTrunk
} from "./math.templates/simple";
import {generateCollatzSequenceAdic, getVProfile} from "./math";
import {createCollatzPhaseRenderer} from "./draw/z.depth.renderer/renderer.ts";

(async (): Promise<void> => {
    await onDocReady();

    createCollatzPhaseRenderer(
        document.getElementById('threeCanvas') as HTMLCanvasElement,
        generateCollatzSequenceAdic(13255, {}, { trackAdic: true }).adic.vProfile,
        {
            pointSize: 0.5,
            axisScale: 10,
            backgroundColor: 0x020304,
            maxColorSteps: 15
        });
    // initRenderer({
    //     parent: document.getElementById('pixiTarget'),
    // });

    // console.log(generateCollatzSequenceAdic(6, {}, { trackAdic: true }));

    // outputSovereignTrunk();

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(81, {}, { trackAdic: true }).adic.vProfile,
    // });

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(13255, {}, { trackAdic: true }).adic.vProfile,
    // });

    // const lord = generateCollatzSequenceAdic(1536, {}, { trackAdic: true });
    //
    // console.log(lord);
    //
    // updateRenderer({
    //     sequence: lord.adic!.vProfile,
    // });


    // updateRenderer({
    //     sequence: [
    //         getVProfile(32),
    //         getVProfile(40),
    //         getVProfile(48),
    //         getVProfile(56),
    //         getVProfile(64),
    // //
    // //         getVProfile(64),
    // //         getVProfile(80),
    // //         getVProfile(96),
    // //         getVProfile(112),
    // //         getVProfile(128)
    //     ],
    // });

    // updateRenderer({
    //     sequence: generateCollatzSequenceAdic(54, {}, { trackAdic: true }).adic.vProfile,
    // });

    // outputScaryPeakAlpha();
})();