import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { collatzBrotFrag } from './shader.frag';
import type { CollatzBrotRendererOptions } from './types';

function cpuEscapeTime(
    cx: number, cy: number,
    eps: number, maxIter: number,
): number {
    let zx = 0, zy = 0;
    for (let i = 0; i < maxIter; i++) {
        if (zx * zx + zy * zy > 256) return i;

        const zx2 = zx * zx - zy * zy;
        const zy2 = 2 * zx * zy;

        const px = Math.PI * zx;
        const py = Math.PI * Math.max(-18, Math.min(18, zy));
        const ch = Math.cosh(py);
        const sh = Math.sinh(py);
        const cosR = Math.cos(px) * ch;
        const cosI = -Math.sin(px) * sh;

        const a = 2 + 5 * zx, b = 5 * zy;
        const prodR = a * cosR - b * cosI;
        const prodI = a * cosI + b * cosR;

        const cR = 0.25 * (2 + 7 * zx - prodR);
        const cI = 0.25 * (7 * zy - prodI);

        zx = zx2 + cx + eps * (cR - zx);
        zy = zy2 + cy + eps * (cI - zy);
    }
    return maxIter;
}

function findBoundaryTarget(eps: number, maxIter: number): [number, number] {
    const N = 120;
    const xMin = -2.5, xMax = 1.5, yMin = -1.5, yMax = 1.5;

    const grid: number[][] = [];
    for (let j = 0; j < N; j++) {
        grid[j] = [];
        for (let i = 0; i < N; i++) {
            const cx = xMin + (xMax - xMin) * i / (N - 1);
            const cy = yMin + (yMax - yMin) * j / (N - 1);
            grid[j][i] = cpuEscapeTime(cx, cy, eps, maxIter);
        }
    }

    let bestX = -0.75, bestY = 0.1, bestScore = 0;
    for (let j = 1; j < N - 1; j++) {
        for (let i = 1; i < N - 1; i++) {
            const v = grid[j][i];
            if (v >= maxIter || v < 3) continue;
            const dx = Math.abs(grid[j][i + 1] - grid[j][i - 1]);
            const dy = Math.abs(grid[j + 1][i] - grid[j - 1][i]);
            const grad = dx + dy;
            const bonus = (v > maxIter * 0.15 && v < maxIter * 0.7) ? 2.0 : 1.0;
            const score = grad * bonus;
            if (score > bestScore) {
                bestScore = score;
                bestX = xMin + (xMax - xMin) * i / (N - 1);
                bestY = yMin + (yMax - yMin) * j / (N - 1);
            }
        }
    }

    for (let pass = 0; pass < 3; pass++) {
        const radius = 0.06 / Math.pow(3, pass);
        const M = 60;
        const rGrid: number[][] = [];

        for (let j = 0; j < M; j++) {
            rGrid[j] = [];
            for (let i = 0; i < M; i++) {
                const cx = bestX - radius + 2 * radius * i / (M - 1);
                const cy = bestY - radius + 2 * radius * j / (M - 1);
                rGrid[j][i] = cpuEscapeTime(cx, cy, eps, maxIter);
            }
        }

        let rBestScore = 0, rBestX = bestX, rBestY = bestY;
        for (let j = 1; j < M - 1; j++) {
            for (let i = 1; i < M - 1; i++) {
                const v = rGrid[j][i];
                if (v >= maxIter || v < 3) continue;
                const dx = Math.abs(rGrid[j][i + 1] - rGrid[j][i - 1]);
                const dy = Math.abs(rGrid[j + 1][i] - rGrid[j - 1][i]);
                const score = (dx + dy) * ((v > maxIter * 0.15 && v < maxIter * 0.7) ? 2.0 : 1.0);
                if (score > rBestScore) {
                    rBestScore = score;
                    rBestX = bestX - radius + 2 * radius * i / (M - 1);
                    rBestY = bestY - radius + 2 * radius * j / (M - 1);
                }
            }
        }

        bestX = rBestX;
        bestY = rBestY;
    }

    return [bestX, bestY];
}

export function createCollatzBrotRenderer(
    container: HTMLElement,
    options: CollatzBrotRendererOptions = {},
) {
    const {
        maxIter = 120,
        epsilon = 0.06,
        zoomSpeed = 0.12,
        colorSpeed = 0.06,
        initialZoom = 4.0,
    } = options;

    const app = new PIXI.Application({
        resizeTo: container,
        backgroundColor: 0x000005,
        antialias: false,
    });
    container.appendChild(app.view as HTMLCanvasElement);

    const ZOOM_FLOOR = 3e-4;
    const probeIter = Math.min(maxIter, 80);

    let [targetX, targetY] = findBoundaryTarget(epsilon, probeIter);

    let centerX = -0.5;
    let centerY = 0.0;
    let currentZoom = initialZoom;
    let time = 0;
    let zoomingIn = true;

    const paletteOffset = Math.random();

    const filter = new PIXI.Filter(undefined, collatzBrotFrag, {
        u_resolution: [app.screen.width, app.screen.height],
        u_center: [centerX, centerY],
        u_zoom: currentZoom,
        u_maxIter: maxIter,
        u_epsilon: epsilon,
        u_time: 0.0,
        u_paletteOffset: paletteOffset,
    });
    filter.resolution = window.devicePixelRatio || 1;

    const bg = new PIXI.Sprite(PIXI.Texture.WHITE);
    bg.width = app.screen.width;
    bg.height = app.screen.height;
    bg.filters = [filter];
    app.stage.addChild(bg);

    const aspect = () => app.screen.width / app.screen.height;

    const onResize = () => {
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        filter.uniforms.u_resolution[0] = app.screen.width;
        filter.uniforms.u_resolution[1] = app.screen.height;
    };
    window.addEventListener('resize', onResize);

    const tickerCallback = () => {
        const dt = gsap.ticker.deltaRatio() / 60;

        if (zoomingIn) {
            currentZoom *= 1.0 - zoomSpeed * dt;
            if (currentZoom <= ZOOM_FLOOR) {
                zoomingIn = false;
                [targetX, targetY] = findBoundaryTarget(epsilon, probeIter);
            }
        } else {
            currentZoom *= 1.0 + zoomSpeed * 0.4 * dt;
            if (currentZoom >= initialZoom) {
                currentZoom = initialZoom;
                zoomingIn = true;
            }
        }

        time += colorSpeed * dt;

        const lf = 1.0 - Math.pow(0.993, dt * 60);
        centerX += (targetX - centerX) * lf;
        centerY += (targetY - centerY) * lf;

        filter.uniforms.u_zoom = currentZoom;
        filter.uniforms.u_center[0] = centerX;
        filter.uniforms.u_center[1] = centerY;
        filter.uniforms.u_time = time;
    };

    gsap.ticker.add(tickerCallback);

    return () => {
        gsap.ticker.remove(tickerCallback);
        window.removeEventListener('resize', onResize);
        app.destroy(true, { children: true, texture: true });
    };
}
