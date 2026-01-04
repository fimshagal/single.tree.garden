import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {AggregatedPoint} from "./types.ts";
import type {VProfile} from "../../math";


export interface CollatzPhaseRendererOptions {
    pointSize?: number;
    axisScale?: number;
    backgroundColor?: number;
    maxColorSteps?: number; // скільки градацій (10–15)
}

function aggregatePoints(points: VProfile[]): AggregatedPoint[] {
    const map = new Map<string, AggregatedPoint>();

    for (const p of points) {
        const key = `${p.v2}|${p.v3}|${p.z3ChainDepth}`;
        const existing = map.get(key);
        if (existing) {
            existing.count += 1;
        } else {
            map.set(key, { v2: p.v2, v3: p.v3, zDepth: p.z3ChainDepth, count: 1 });
        }
    }

    return Array.from(map.values());
}

export function createCollatzPhaseRenderer(
    canvas: HTMLCanvasElement,
    points: VProfile[],
    options: CollatzPhaseRendererOptions = {}
): () => void {
    const {
        pointSize = 1,
        axisScale = 10,
        backgroundColor = 0x050509,
        maxColorSteps = 15,
    } = options;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(10, 10, 20);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // --- агрегація за (v2, v3, z) ---
    const aggregated = aggregatePoints(points);

    // масштаби по ν2, ν3, z
    const maxV2 = aggregated.reduce((m, p) => Math.max(m, p.v2), 0) || 1;
    const maxV3 = aggregated.reduce((m, p) => Math.max(m, p.v3), 0) || 1;
    const maxZ  = aggregated.reduce((m, p) => Math.max(m, p.zDepth), 0)  || 1;

    const halfScaleX = axisScale;
    const halfScaleY = axisScale;
    const halfScaleZ = axisScale * 0.7;

    addAxes(scene, axisScale);

    if (aggregated.length > 0) {
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const colors: number[] = [];
        const color = new THREE.Color();

        // попередньо знайдемо максимальний count, якщо захочеш нормалізувати
        const maxCount = aggregated.reduce((m, p) => Math.max(m, p.count), 0) || 1;

        for (const p of aggregated) {
            const nx = maxV2 ? p.v2 / maxV2 : 0;
            const ny = maxV3 ? p.v3 / maxV3 : 0;
            const nz = maxZ  ? p.zDepth  / maxZ  : 0;

            const x = (nx - 0.5) * 2 * halfScaleX;
            const y = (ny - 0.5) * 2 * halfScaleY;
            const z = (nz - 0.0) * halfScaleZ;

            positions.push(x, y, z);

            // --- правило: кожні 10 повторів -> світліший колір ---
            const bucket = Math.min(
                maxColorSteps - 1,
                Math.floor(p.count / 10)
            );
            const t = bucket / (maxColorSteps - 1 || 1); // 0..1

            // від темно-фіолетового до білого:
            // base: приблизно hsl(280°, 100%, 15%)
            const base = new THREE.Color().setHSL(280 / 360, 1.0, 0.15);
            const white = new THREE.Color(0xffffff);

            color.copy(base).lerp(white, t);

            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
        );
        geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(colors, 3)
        );

        const material = new THREE.PointsMaterial({
            size: pointSize,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.98,
        });

        const pointsMesh = new THREE.Points(geometry, material);
        scene.add(pointsMesh);
    }

    let stopped = false;

    const onResize = () => {
        if (stopped) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    };

    window.addEventListener("resize", onResize);

    const animate = () => {
        if (stopped) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    const dispose = () => {
        stopped = true;
        window.removeEventListener("resize", onResize);
        controls.dispose();
        renderer.dispose();
    };

    return dispose;
}

function addAxes(scene: THREE.Scene, scale: number) {
    const axesHelper = new THREE.AxesHelper(scale);
    scene.add(axesHelper);

    const grid = new THREE.GridHelper(scale * 2, 10, 0x333333, 0x222222);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    scene.add(grid);
}