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
        initialCenter = [-0.2, 0.0],
        initialZoom = 6.0,
        zoomTarget = [-0.2, 0.65],
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
    let time = 0;
    let morphTime = 0;

    const tickerCallback = () => {
        const dt = gsap.ticker.deltaRatio() / 60;

        currentZoom *= 1.0 - zoomSpeed * dt;
        currentZoom = Math.max(1e-10, currentZoom);

        const lerpFactor = 1.0 - Math.pow(0.98, dt * 60);
        centerX += (zoomTarget[0] - centerX) * lerpFactor;
        centerY += (zoomTarget[1] - centerY) * lerpFactor;

        time += colorSpeed * dt;
        morphTime += morphSpeed * dt;

        const [cx, cy] = lerpC(cPath, morphTime);

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
