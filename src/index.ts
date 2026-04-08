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
import {createBinaryWalkRenderer} from "./draw/binary.walk.renderer";
import {createCollatzFractalRenderer} from "./draw/collatz.fractal.renderer";
import {createCollatzFractal3DRenderer} from "./draw/collatz.fractal.3d.renderer";
import {createExp2FractalRenderer} from "./draw/exp2.fractal.renderer";
import {createCollatzBrotRenderer} from "./draw/collatz.brot.renderer";
import {createRadialMapRenderer} from "./draw/radial.map.renderer";

(async (): Promise<void> => {
    await onDocReady();

    const collatzSeq= generateCollatzSequenceAdic(33111071, {
        multiplier: 7,
        increment: -13,
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
        while (seq.length < 1500) {
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

        for (let i = 1; i < 13; i++) {
            seq.push(getVProfile(i));
        }

        return seq;
    })();

    /* createCollatzPhaseRenderer(
        document.getElementById('threeCanvas') as HTMLCanvasElement,
        collatzSeq,
        {
            pointSize: 0.15,
            axisScale: 10,
            backgroundColor: 0x020304,
            maxColorSteps: 15,
            showTrajectory: true,
            trajectoryOpacity: 0.75,
        }); */

    const oddOnlyResult = generateCollatzSequenceAdic(31, {
        multiplier: 5,
        increment: -3
    }, {
        mode: "oddOnly",
        maxSteps: 200_000,
    });

    // createBinaryWalkRenderer(
    //     document.getElementById('pixiTarget')!,
    //     oddOnlyResult.sequence,
    //     {
    //         stepLength: 1,
    //         useGradient: true,
    //     });

    // createCollatzFractalRenderer(
    //     document.getElementById('pixiTarget')!,
    //     oddOnlyResult.sequence,
    //     {
    //         maxIter: 128,
    //         zoomSpeed: 0.15,
    //         colorSpeed: 0.08,
    //         morphSpeed: 0.5,
    //         morphRadius: 0.3,
    //         initialZoom: 6.0,
    //     });

    // createCollatzFractal3DRenderer(
    //     document.getElementById('threeCanvas') as HTMLCanvasElement,
    //     oddOnlyResult.sequence, //oddOnlyResult.sequence,
    //     {
    //         maxIter: 128,
    //         zoomSpeed: 0.03,
    //         colorSpeed: 0.06,
    //         morphSpeed: 0.7,
    //         morphRadius: 1,
    //         orbitSpeed: 0.08,
    //         zScale: 0.8,
    //     });

    const pow2Seq = (() => {
        const seq: number[] = [];
        for (let n = 2; n <= 20; n++) {
            const lo = 2 ** n;
            const hi = 2 ** (n + 1);
            const mid = 3 * 2 ** (n - 1);

            seq.push(lo);
            seq.push(mid);

            if (n >= 4) {
                seq.push(5 * 2 ** (n - 2));
                seq.push(7 * 2 ** (n - 2));
            }

            const oddLo = lo + 1;
            const oddHi = hi - 1;
            let rndOdd = oddLo + Math.floor(Math.random() * (oddHi - oddLo));
            if (rndOdd % 2 === 0) rndOdd++;
            if (rndOdd <= oddHi) seq.push(rndOdd);
        }
        return seq.sort((a, b) => a - b);
    })();

    // createExp2FractalRenderer(
    //     document.getElementById('pixiTarget')!,
    //     pow2Seq,
    //     {
    //         maxIter: 100,
    //         zoomSpeed: 0.2,
    //         colorSpeed: 0.71,
    //         morphSpeed: 0.2,
    //         morphRadius: 0.4,
    //         initialZoom: 3.0,
    //     });

    // createCollatzBrotRenderer(
    //     document.getElementById('pixiTarget')!,
    //     {
    //         maxIter: 120,
    //         epsilon: 0.06,
    //         zoomSpeed: 0.25,
    //         colorSpeed: 1,
    //         initialZoom: 4.0,
    //     });

    createRadialMapRenderer(document.getElementById('pixiTarget')!, {
        graph: {
            minZone: 2,
            maxZone: 16,
            maxInverseDepth: 50,
            maxNodes: 47_000,
            forwardFill: true,
            forwardFillMaxZone: 15, // q
            multiplier: 1,
            increment: 1,
        },
        ringSpacing: 42,
        innerRadius: 30,
        edgeOpacity: 0.12,
        showDiv2Edges: false,
        predictCausticZones: 12
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