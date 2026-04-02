import * as THREE from "three";
import { gsap } from "gsap";
import { collatz3dFrag } from "./shader.frag.ts";
import { collatz3dVert } from "./shader.vert.ts";
import type { CollatzFractal3DRendererOptions } from "./types.ts";

// --- sequence → c-path (same as 2D) ---

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

// --- CPU boundary probe ---

const PI = Math.PI;

function cpuCosh(x: number) {
    const ex = Math.exp(Math.min(80, Math.max(-80, x)));
    return (ex + 1 / ex) * 0.5;
}
function cpuSinh(x: number) {
    const ex = Math.exp(Math.min(80, Math.max(-80, x)));
    return (ex - 1 / ex) * 0.5;
}

function cpuCollatzJulia(
    zr: number, zi: number, cr: number, ci: number
): [number, number] {
    const px = PI * zr, py = PI * zi;
    const cosR = Math.cos(px) * cpuCosh(py);
    const cosI = -Math.sin(px) * cpuSinh(py);
    const ar = 2 + 7 * zr, ai = 7 * zi;
    const br = 2 + 5 * zr, bi = 5 * zi;
    return [
        0.25 * (ar - (br * cosR - bi * cosI)) + cr,
        0.25 * (ai - (br * cosI + bi * cosR)) + ci,
    ];
}

function cpuEscapeTime3D(
    px: number, py: number, pz: number,
    cr: number, ci: number, zScale: number, maxIter: number
): number {
    let zr = px, zi = py;
    const cEr = cr, cEi = ci + pz * zScale;
    for (let i = 0; i < maxIter; i++) {
        if (zr * zr + zi * zi > 1e4) return i;
        if (Math.abs(zi) > 12) return i;
        [zr, zi] = cpuCollatzJulia(zr, zi, cEr, cEi);
    }
    return maxIter;
}

const PROBE_GRID = 12;
const PROBE_ITER = 30;

function findBoundaryTarget(
    camPos: THREE.Vector3, camTarget: THREE.Vector3,
    cr: number, ci: number, zScale: number
): THREE.Vector3 | null {
    const fwd = new THREE.Vector3().subVectors(camTarget, camPos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);

    const dist = camPos.distanceTo(camTarget);
    const spread = dist * 0.8;

    let sumX = 0, sumY = 0, sumZ = 0, weight = 0;

    for (let gy = 0; gy < PROBE_GRID; gy++) {
        for (let gx = 0; gx < PROBE_GRID; gx++) {
            const u = (gx + 0.5) / PROBE_GRID - 0.5;
            const v = (gy + 0.5) / PROBE_GRID - 0.5;

            const px = camTarget.x + right.x * u * spread + up.x * v * spread;
            const py = camTarget.y + right.y * u * spread + up.y * v * spread;
            const pz = camTarget.z + right.z * u * spread + up.z * v * spread;

            const esc = cpuEscapeTime3D(px, py, pz, cr, ci, zScale, PROBE_ITER);

            if (esc > 1 && esc < PROBE_ITER) {
                const mid = PROBE_ITER / 2;
                const w = 1.0 - Math.abs(esc - mid) / mid;
                sumX += px * w;
                sumY += py * w;
                sumZ += pz * w;
                weight += w;
            }
        }
    }

    if (weight < 0.3) return null;
    return new THREE.Vector3(sumX / weight, sumY / weight, sumZ / weight);
}

// --- renderer ---

export function createCollatzFractal3DRenderer(
    canvas: HTMLCanvasElement,
    sequence: number[],
    options: CollatzFractal3DRendererOptions = {}
): () => void {
    const {
        maxIter = 128,
        zoomSpeed = 0.12,
        colorSpeed = 0.06,
        morphSpeed = 0.4,
        morphRadius = 0.25,
        orbitSpeed = 0.25,
        zScale = 0.8,
        backgroundColor = 0x020106,
    } = options;

    const cPath = sequenceToCPath(sequence, morphRadius);

    canvas.style.display = "block";

    const getSize = () => ({
        w: canvas.clientWidth || window.innerWidth,
        h: canvas.clientHeight || window.innerHeight,
    });

    const { w, h } = getSize();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        u_resolution: { value: new THREE.Vector2(w * devicePixelRatio, h * devicePixelRatio) },
        u_cameraPos: { value: new THREE.Vector3(3.0, 1.5, 1.0) },
        u_cameraTarget: { value: new THREE.Vector3(0.3, 0.0, 0.0) },
        u_c: { value: new THREE.Vector2(0, 0) },
        u_zScale: { value: zScale },
        u_maxIter: { value: maxIter },
        u_time: { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
        vertexShader: collatz3dVert,
        fragmentShader: collatz3dFrag,
        uniforms,
        depthWrite: false,
        depthTest: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    let orbitAngle = 0;
    let orbitRadius = 3.5;
    let orbitHeight = 1.2;
    let targetPos = new THREE.Vector3(0.3, 0.0, 0.0);
    let morphTime = 0;
    let time = 0;
    let frameCount = 0;

    const tickerCallback = () => {
        const dt = gsap.ticker.deltaRatio() / 60;
        frameCount++;

        orbitAngle += orbitSpeed * dt;
        orbitRadius *= 1.0 - zoomSpeed * dt;
        orbitRadius = Math.max(0.05, orbitRadius);
        orbitHeight *= 1.0 - zoomSpeed * 0.4 * dt;

        morphTime += morphSpeed * dt;
        time += colorSpeed * dt;

        const [cx, cy] = lerpC(cPath, morphTime);

        if (frameCount % 30 === 0) {
            const hit = findBoundaryTarget(
                uniforms.u_cameraPos.value,
                targetPos,
                cx, cy, zScale
            );
            if (hit) {
                targetPos.lerp(hit, 0.4);
            }
        }

        const camX = Math.cos(orbitAngle) * orbitRadius + targetPos.x;
        const camY = orbitHeight + targetPos.y;
        const camZ = Math.sin(orbitAngle) * orbitRadius + targetPos.z;

        uniforms.u_cameraPos.value.set(camX, camY, camZ);
        uniforms.u_cameraTarget.value.copy(targetPos);
        uniforms.u_c.value.set(cx, cy);
        uniforms.u_time.value = time;

        renderer.render(scene, camera);
    };

    gsap.ticker.add(tickerCallback);

    const onResize = () => {
        const { w: rw, h: rh } = getSize();
        renderer.setSize(rw, rh, false);
        uniforms.u_resolution.value.set(rw * devicePixelRatio, rh * devicePixelRatio);
    };

    window.addEventListener("resize", onResize);

    return () => {
        gsap.ticker.remove(tickerCallback);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        material.dispose();
    };
}
