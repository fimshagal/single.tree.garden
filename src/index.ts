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

    const collatzSeq = generateCollatzSequenceAdic(171, {
        multiplier: 7,
        increment: -5
    }, { trackAdic: true }).adic.vProfile;

    const fibSeq = (() => {
        const seq = [];
        let a = 1, b = 1;
        for (let i = 0; i < 90; i++) {
            seq.push(getVProfile(a));
            const next = a + b;
            a = b;
            b = next;
        }
        return seq;
    })();

    const primesSeq = (() => {
        const seq = [];
        const isPrime = (n: number) => {
            if (n < 2) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }
            return true;
        };
        let n = 2;
        while (seq.length < 500) {
            if (isPrime(n)) seq.push(getVProfile(n));
            n++;
        }
        return seq;
    })();

    const perfectSeq = (() => {
        const seq = [];
        const isPrime = (n: number) => {
            if (n < 2) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }
            return true;
        };
        for (let p = 2; p <= 31; p++) {
            const mersenne = 2 ** p - 1;
            if (!isPrime(mersenne)) continue;
            const perfect = 2 ** (p - 1) * mersenne;
            if (!Number.isSafeInteger(perfect)) break;
            seq.push(getVProfile(perfect));
        }
        return seq;
    })();

    const factorialSeq = (() => {
        const seq = [];
        let fact = 1;
        for (let n = 1; n <= 170; n++) {
            fact *= n;
            if (!Number.isSafeInteger(fact)) break;
            seq.push(getVProfile(fact));
        }
        return seq;
    })();

    const smoothSeq = (() => {
        const seq = [];
        const limit = 100_000;
        for (let n = 1; n <= limit; n++) {
            let rem = n;
            while (rem % 2 === 0) rem /= 2;
            while (rem % 3 === 0) rem /= 3;
            while (rem % 5 === 0) rem /= 5;
            if (rem === 1) seq.push(getVProfile(n));
        }
        return seq;
    })();

    const stupidSeq = (() => {
        const seq = [];

        for (let i = 1; i < 1001; i++) {
            seq.push(getVProfile(i));
        }

        return seq;
    })();

    createCollatzPhaseRenderer(
        document.getElementById('threeCanvas') as HTMLCanvasElement,
        collatzSeq,
        {
            pointSize: 0.15,
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