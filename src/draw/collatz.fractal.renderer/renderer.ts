import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { collatzFractalFrag } from "./shader.frag.ts";
import type { CollatzFractalRendererOptions } from "./types.ts";

function sequenceToCPath(sequence: number[], radius: number): [number, number][] {
    if (sequence.length === 0) return [[0, 0]];

    const logVals = sequence.map(n => Math.log(Math.abs(n) + 1));
    const maxLog = Math.max(...logVals, 1);

    return logVals.map((lv, i) => {
        const norm = lv / maxLog;
        const angle = (i / sequence.length) * Math.PI * 2;
        const r = norm * radius;
        return [r * Math.cos(angle), r * Math.sin(angle)];
    });
}

function lerpC(
    cPath: [number, number][],
    t: number
): [number, number] {
    if (cPath.length === 1) return cPath[0];

    const total = cPath.length;
    const wrapped = ((t % total) + total) % total;
    const idx = Math.floor(wrapped);
    const frac = wrapped - idx;

    const a = cPath[idx % total];
    const b = cPath[(idx + 1) % total];

    return [
        a[0] + (b[0] - a[0]) * frac,
        a[1] + (b[1] - a[1]) * frac,
    ];
}

// --- CPU-side Collatz iteration for boundary probing ---

const PI = Math.PI;

function cpuCosh(x: number): number {
    const ex = Math.exp(Math.min(80, Math.max(-80, x)));
    return (ex + 1 / ex) * 0.5;
}

function cpuSinh(x: number): number {
    const ex = Math.exp(Math.min(80, Math.max(-80, x)));
    return (ex - 1 / ex) * 0.5;
}

function cpuCollatzJulia(
    zr: number, zi: number,
    cr: number, ci: number
): [number, number] {
    const px = PI * zr;
    const py = PI * zi;
    const cosR = Math.cos(px) * cpuCosh(py);
    const cosI = -Math.sin(px) * cpuSinh(py);

    const ar = 2 + 7 * zr;
    const ai = 7 * zi;

    const br = 2 + 5 * zr;
    const bi = 5 * zi;
    const bcR = br * cosR - bi * cosI;
    const bcI = br * cosI + bi * cosR;

    return [
        0.25 * (ar - bcR) + cr,
        0.25 * (ai - bcI) + ci,
    ];
}

function cpuEscapeTime(
    zr: number, zi: number,
    cr: number, ci: number,
    maxIter: number
): number {
    for (let i = 0; i < maxIter; i++) {
        if (zr * zr + zi * zi > 1e4) return i;
        if (Math.abs(PI * zi) > 60) return i;
        [zr, zi] = cpuCollatzJulia(zr, zi, cr, ci);
    }
    return maxIter;
}

const PROBE_GRID = 24;
const PROBE_SAMPLE_ITER = 40;

function findBoundaryCenter(
    centerX: number, centerY: number,
    zoom: number, aspect: number,
    cr: number, ci: number,
): [number, number] | null {
    let sumX = 0, sumY = 0, weight = 0;

    for (let gy = 0; gy < PROBE_GRID; gy++) {
        for (let gx = 0; gx < PROBE_GRID; gx++) {
            const u = (gx + 0.5) / PROBE_GRID - 0.5;
            const v = (gy + 0.5) / PROBE_GRID - 0.5;
            const px = centerX + u * aspect * zoom;
            const py = centerY + v * zoom;

            const esc = cpuEscapeTime(px, py, cr, ci, PROBE_SAMPLE_ITER);

            if (esc > 1 && esc < PROBE_SAMPLE_ITER) {
                const mid = PROBE_SAMPLE_ITER / 2;
                const w = 1.0 - Math.abs(esc - mid) / mid;
                sumX += px * w;
                sumY += py * w;
                weight += w;
            }
        }
    }

    if (weight < 0.5) return null;
    return [sumX / weight, sumY / weight];
}

// ---

export function createCollatzFractalRenderer(
    parent: HTMLElement,
    sequence: number[],
    options: CollatzFractalRendererOptions = {}
): () => void {
    const {
        maxIter = 128,
        zoomSpeed = 0.15,
        colorSpeed = 0.08,
        morphSpeed = 0.5,
        morphRadius = 0.3,
        initialCenter = [0.3, 0.0],
        initialZoom = 6.0,
        backgroundColor = 0x000000,
    } = options;

    const cPath = sequenceToCPath(sequence, morphRadius);

    const app = new PIXI.Application({
        resizeTo: parent,
        backgroundColor,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    parent.appendChild(app.view as HTMLCanvasElement);

    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;

    const uniforms = {
        u_resolution: new Float32Array([
            app.screen.width * (window.devicePixelRatio || 1),
            app.screen.height * (window.devicePixelRatio || 1),
        ]),
        u_center: new Float32Array(initialCenter),
        u_c: new Float32Array([0, 0]),
        u_zoom: initialZoom,
        u_maxIter: maxIter,
        u_colorSpeed: 1.0,
        u_time: 0.0,
    };

    const filter = new PIXI.Filter(undefined, collatzFractalFrag, uniforms);
    filter.resolution = window.devicePixelRatio || 1;

    sprite.filters = [filter];
    app.stage.addChild(sprite);

    let currentZoom = initialZoom;
    let centerX = initialCenter[0];
    let centerY = initialCenter[1];
    let targetX = initialCenter[0];
    let targetY = initialCenter[1];
    let time = 0;
    let morphTime = 0;
    let frameCount = 0;

    const aspect = () => {
        const r = window.devicePixelRatio || 1;
        return (app.screen.width * r) / (app.screen.height * r);
    };

    const tickerCallback = () => {
        const dt = gsap.ticker.deltaRatio() / 60;
        frameCount++;

        currentZoom *= 1.0 - zoomSpeed * dt;
        currentZoom = Math.max(1e-10, currentZoom);

        time += colorSpeed * dt;
        morphTime += morphSpeed * dt;

        const [cx, cy] = lerpC(cPath, morphTime);

        if (frameCount % 20 === 0) {
            const hit = findBoundaryCenter(
                centerX, centerY,
                currentZoom, aspect(),
                cx, cy,
            );
            if (hit) {
                targetX = hit[0];
                targetY = hit[1];
            }
        }

        const lf = 1.0 - Math.pow(0.96, dt * 60);
        centerX += (targetX - centerX) * lf;
        centerY += (targetY - centerY) * lf;

        filter.uniforms.u_zoom = currentZoom;
        filter.uniforms.u_center[0] = centerX;
        filter.uniforms.u_center[1] = centerY;
        filter.uniforms.u_c[0] = cx;
        filter.uniforms.u_c[1] = cy;
        filter.uniforms.u_time = time;
    };

    gsap.ticker.add(tickerCallback);

    const onResize = () => {
        sprite.width = app.screen.width;
        sprite.height = app.screen.height;
        filter.uniforms.u_resolution[0] = app.screen.width * (window.devicePixelRatio || 1);
        filter.uniforms.u_resolution[1] = app.screen.height * (window.devicePixelRatio || 1);
    };

    window.addEventListener("resize", onResize);

    return () => {
        gsap.ticker.remove(tickerCallback);
        window.removeEventListener("resize", onResize);
        app.destroy(true, { children: true, texture: true });
    };
}
