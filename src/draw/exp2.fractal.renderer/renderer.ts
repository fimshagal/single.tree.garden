import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { exp2FractalFrag } from "./shader.frag.ts";
import type { Exp2FractalRendererOptions } from "./types.ts";

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

function lerpC(cPath: [number, number][], t: number): [number, number] {
    if (cPath.length === 1) return cPath[0];
    const total = cPath.length;
    const wrapped = ((t % total) + total) % total;
    const idx = Math.floor(wrapped);
    const frac = wrapped - idx;
    const a = cPath[idx % total];
    const b = cPath[(idx + 1) % total];
    return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
}

// --- CPU probe for boundary tracking ---

const LN2 = Math.LN2;

function cpuPow2Julia(zr: number, zi: number, cr: number, ci: number): [number, number] {
    const ex = Math.exp(Math.min(80, Math.max(-80, zr * LN2)));
    const angle = zi * LN2;
    return [ex * Math.cos(angle) + cr, ex * Math.sin(angle) + ci];
}

function cpuEscapeTime(
    zr: number, zi: number, cr: number, ci: number, maxIter: number
): number {
    for (let i = 0; i < maxIter; i++) {
        if (zr * zr + zi * zi > 2500) return i;
        if (zr > 50) return i;
        [zr, zi] = cpuPow2Julia(zr, zi, cr, ci);
    }
    return maxIter;
}

const PROBE_GRID = 24;
const PROBE_ITER = 40;

function findBoundaryCenter(
    centerX: number, centerY: number,
    zoom: number, aspect: number,
    cr: number, ci: number,
): [number, number] | null {
    const grid: number[][] = [];
    const coords: [number, number][][] = [];

    for (let gy = 0; gy < PROBE_GRID; gy++) {
        grid[gy] = [];
        coords[gy] = [];
        for (let gx = 0; gx < PROBE_GRID; gx++) {
            const u = (gx + 0.5) / PROBE_GRID - 0.5;
            const v = (gy + 0.5) / PROBE_GRID - 0.5;
            const px = centerX + u * aspect * zoom;
            const py = centerY + v * zoom;
            grid[gy][gx] = cpuEscapeTime(px, py, cr, ci, PROBE_ITER);
            coords[gy][gx] = [px, py];
        }
    }

    let sumX = 0, sumY = 0, weight = 0;

    for (let gy = 1; gy < PROBE_GRID - 1; gy++) {
        for (let gx = 1; gx < PROBE_GRID - 1; gx++) {
            const esc = grid[gy][gx];
            if (esc <= 1 || esc >= PROBE_ITER) continue;

            const variance =
                Math.abs(esc - grid[gy - 1][gx]) +
                Math.abs(esc - grid[gy + 1][gx]) +
                Math.abs(esc - grid[gy][gx - 1]) +
                Math.abs(esc - grid[gy][gx + 1]);

            if (variance < 0.5) continue;

            const u = (gx + 0.5) / PROBE_GRID - 0.5;
            const v = (gy + 0.5) / PROBE_GRID - 0.5;
            const dist = Math.sqrt(u * u + v * v) * 2;
            const centerW = 1.0 - Math.min(dist, 1.0);

            const w = variance * variance * (0.4 + 0.6 * centerW);

            const [px, py] = coords[gy][gx];
            sumX += px * w;
            sumY += py * w;
            weight += w;
        }
    }

    if (weight < 0.3) return null;

    const tx = sumX / weight;
    const ty = sumY / weight;
    const maxDrift = zoom * 0.25;
    const dx = tx - centerX;
    const dy = ty - centerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > maxDrift) {
        const s = maxDrift / d;
        return [centerX + dx * s, centerY + dy * s];
    }
    return [tx, ty];
}

// --- renderer ---

export function createExp2FractalRenderer(
    parent: HTMLElement,
    sequence: number[],
    options: Exp2FractalRendererOptions = {}
): () => void {
    const {
        maxIter = 100,
        zoomSpeed = 0.03,
        colorSpeed = 0.06,
        morphSpeed = 0.5,
        morphRadius = 0.4,
        initialCenter = [0.0, 0.0],
        initialZoom = 8.0,
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
        u_paletteOffset: Math.random(),
    };

    const filter = new PIXI.Filter(undefined, exp2FractalFrag, uniforms);
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
        currentZoom = Math.max(1e-6, currentZoom);

        time += colorSpeed * dt;
        morphTime += morphSpeed * dt;

        const [cx, cy] = lerpC(cPath, morphTime);

        

        const lf = 1.0 - Math.pow(0.985, dt * 60);
        centerX += (targetX - centerX) * lf;
        centerY += (targetY - centerY) * lf;

        filter.uniforms.u_zoom = currentZoom;
        filter.uniforms.u_center[0] = centerX;
        filter.uniforms.u_center[1] = centerY;
        filter.uniforms.u_c[0] = cx;
        filter.uniforms.u_c[1] = cy;
        filter.uniforms.u_time = time;
    };

    let mouseActive = false;

    const onMouseMove = (e: MouseEvent) => {
        mouseActive = true;
        const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
        const u = (e.clientX - rect.left) / rect.width;
        const v = 1.0 - (e.clientY - rect.top) / rect.height;
        const asp = aspect();
        targetX = centerX + (u - 0.5) * asp * currentZoom;
        targetY = centerY + (v - 0.5) * currentZoom;
    };

    const onMouseLeave = () => {
        mouseActive = false;
    };

    const canvas = app.view as HTMLCanvasElement;
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

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
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mouseleave", onMouseLeave);
        app.destroy(true, { children: true, texture: true });
    };
}
