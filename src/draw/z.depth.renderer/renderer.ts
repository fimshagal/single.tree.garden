import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {AggregatedPoint} from "./types.ts";
import type {VProfile} from "../../math";


export interface CollatzPhaseRendererOptions {
    pointSize?: number;
    axisScale?: number;     // мінімальна довжина осі (у "цілих" одиницях)
    backgroundColor?: number;
    maxColorSteps?: number; // скільки градацій (10–15)
    tickStep?: number;      // крок поділок (за замовч. 1 = кожне ціле число)
    labelEvery?: number;    // як часто підписувати поділки (за замовч. = tickStep)
    palette?: "purpleToWhite" | "turbo";
}

function setTurboColor(t: number, out: THREE.Color) {
    // Turbo colormap by Anton Mikhailov (Google). Bright, high-contrast.
    // t in [0,1] -> out RGB in [0,1]
    const x = Math.min(1, Math.max(0, t));
    const r =
        0.13572138 +
        x * (4.61539260 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))));
    const g =
        0.09140261 +
        x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))));
    const b =
        0.10667330 +
        x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))));

    out.setRGB(Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b)));
}

// We want vivid colors, but Three.js expects vertex colors in LINEAR space.
// Define endpoints in sRGB (artist-friendly), convert once to linear, then lerp in linear.
const C_PURPLE = new THREE.Color(0xbf00ff).convertSRGBToLinear();
const C_CHERRY = new THREE.Color(0x910048).convertSRGBToLinear();
const C_ORANGE = new THREE.Color(0xff8c00).convertSRGBToLinear();
const C_YELLOW = new THREE.Color(0xffff00).convertSRGBToLinear();
const C_WHITE  = new THREE.Color(0xffffff).convertSRGBToLinear();

function setPurpleToWhiteColor(t: number, out: THREE.Color) {
    const x = Math.min(1, Math.max(0, t));
    
    if (x < 0.25) {
        out.copy(C_PURPLE).lerp(C_CHERRY, x / 0.25);
    } else if (x < 0.5) {
        out.copy(C_CHERRY).lerp(C_ORANGE, (x - 0.25) / 0.25);
    } else if (x < 0.75) {
        out.copy(C_ORANGE).lerp(C_YELLOW, (x - 0.5) / 0.25);
    } else {
        out.copy(C_YELLOW).lerp(C_WHITE, (x - 0.75) / 0.25);
    }
}

function createTextSprite(
    text: string,
    {
        color = "#e8e8e8",
        font = "bold 48px system-ui, -apple-system, Segoe UI, Roboto, Arial",
        padding = 18,
        background = "rgba(0,0,0,0.0)",
    }: {
        color?: string;
        font?: string;
        padding?: number;
        background?: string;
    } = {}
): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        // Fallback empty sprite
        const tex = new THREE.Texture();
        return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    }

    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const fontSizeMatch = /(\d+)px/.exec(font);
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 48;
    const textHeight = Math.ceil(fontSize * 1.2);

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Re-apply font after resizing canvas
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    if (background && background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    // scale will be set by caller in world units
    return sprite;
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
        tickStep = 1,
        labelEvery,
        palette = "purpleToWhite",
    } = options;

    // If the canvas has no CSS size, it defaults to 300x150 and the plot will feel "off".
    // We also make it a block element to avoid inline layout quirks.
    canvas.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const getCanvasSize = (): { width: number; height: number } => {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        return { width, height };
    };

    const { width: initialWidth, height: initialHeight } = getCanvasSize();

    const camera = new THREE.PerspectiveCamera(
        60,
        initialWidth / initialHeight,
        0.1,
        1000
    );
    // position will be set after we know axis extents

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(initialWidth, initialHeight, false);
    // Make color output predictable/bright across devices.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Stronger lighting (Collatz plot needs readable colors more than "realistic" shading)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1a1a2a, 1.2);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.6);
    dirLight.position.set(10, 20, 14);
    scene.add(dirLight);

    // --- агрегація за (v2, v3, z) ---
    const aggregated = aggregatePoints(points);

    // Collatz intent: integer axes. One unit in world space == one integer step on the axis.
    const maxV2 = aggregated.reduce((m, p) => Math.max(m, p.v2), 0);
    const maxV3 = aggregated.reduce((m, p) => Math.max(m, p.v3), 0);
    const maxZ  = aggregated.reduce((m, p) => Math.max(m, p.zDepth), 0);

    const scaleX = Math.max(axisScale, Math.ceil(maxV2));
    const scaleY = Math.max(axisScale, Math.ceil(maxV3));
    const scaleZ = Math.max(axisScale, Math.ceil(maxZ));

    // Ensure camera clipping planes cover the full integer volume.
    const maxScale = Math.max(scaleX, scaleY, scaleZ);
    camera.near = 0.01;
    camera.far = Math.max(2000, maxScale * 10);
    camera.updateProjectionMatrix();

    addAxes(scene, {
        scale: { x: scaleX, y: scaleY, z: scaleZ },
        ranges: {
            x: { min: 0, max: scaleX, name: "v2" },
            y: { min: 0, max: scaleY, name: "v3" },
            z: { min: 0, max: scaleZ, name: "zDepth" },
        },
        tickStep,
        labelEvery: labelEvery ?? tickStep,
    });

    // Orbit around the center of the data volume (not around the origin).
    controls.target.set(scaleX / 2, scaleY / 2, scaleZ / 2);
    camera.lookAt(controls.target);
    camera.position.set(maxScale * 1.2, maxScale * 0.9, maxScale * 1.6);

    if (aggregated.length > 0) {
        // Render as instanced spheres for "ball" look + per-point heat colors.
        // Treat pointSize as a world-unit radius for spheres (more intuitive than PointsMaterial pixels).
        const sphereRadius = Math.max(0.001, pointSize);
        const geometry = new THREE.SphereGeometry(sphereRadius, 16, 12);
        // Unlit material: colors must be readable, independent of lighting.
        const material = new THREE.MeshBasicMaterial({
            toneMapped: false,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, aggregated.length);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const temp = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < aggregated.length; i++) {
            const p = aggregated[i];

            temp.position.set(p.v2, p.v3, p.zDepth);
            temp.updateMatrix();
            mesh.setMatrixAt(i, temp.matrix);

            // Heatmap: cold (blue) -> hot (red) based on zDepth (renderer intent),
            // with optional brightness boost from count.
            const tRaw = scaleZ > 0 ? Math.min(1, Math.max(0, p.zDepth / scaleZ)) : 0;
            const steps = Math.max(2, Math.floor(maxColorSteps));
            const t = steps > 1 ? Math.round(tRaw * (steps - 1)) / (steps - 1) : tRaw;
            if (palette === "turbo") {
                // Turbo coefficients are defined in sRGB-ish space; convert to linear for correct brightness.
                setTurboColor(t, color);
                color.convertSRGBToLinear();
            } else {
                // Bright purple -> white.
                setPurpleToWhiteColor(t, color);
            }
            // Use Three.js built-in helper to ensure the attribute is wired correctly for InstancedMesh.
            mesh.setColorAt(i, color);
        }

        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
        mesh.instanceMatrix.needsUpdate = true;

        scene.add(mesh);
    }

    let stopped = false;

    const onResize = () => {
        if (stopped) return;
        const { width, height } = getCanvasSize();
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

function addAxes(
    scene: THREE.Scene,
    opts: {
        scale: { x: number; y: number; z: number };
        ranges: {
            x: { min: number; max: number; name: string };
            y: { min: number; max: number; name: string };
            z: { min: number; max: number; name: string };
        };
        tickStep: number;
        labelEvery: number;
    }
) {
    const { scale, ranges, tickStep, labelEvery } = opts;
    // AxesHelper uses one length for all axes; keep it as the max so axes stay visible.
    const maxScale = Math.max(scale.x, scale.y, scale.z);
    const axesHelper = new THREE.AxesHelper(maxScale);
    // Standard AxesHelper is RGB (X-red, Y-green, Z-blue). 
    // We override color to gray for all segments.
    if (axesHelper.geometry.attributes.color) {
        const colors = axesHelper.geometry.attributes.color;
        for (let i = 0; i < colors.count; i++) {
            colors.setXYZ(i, 0.4, 0.4, 0.4); // Medium gray
        }
        colors.needsUpdate = true;
    }
    scene.add(axesHelper);

    // Integer grid in XZ plane: 1 cell == 1 integer step (or tickStep).
    const gridMat = new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.55 });
    const gridGeom = new THREE.BufferGeometry();
    const gridPositions: number[] = [];
    const step = Math.max(1, Math.floor(tickStep));
    const xMax = Math.max(0, Math.floor(scale.x));
    const zMax = Math.max(0, Math.floor(scale.z));

    // Lines parallel to Z (varying X)
    for (let x = 0; x <= xMax; x += step) {
        gridPositions.push(x, 0, 0, x, 0, zMax);
    }
    // Lines parallel to X (varying Z)
    for (let z = 0; z <= zMax; z += step) {
        gridPositions.push(0, 0, z, xMax, 0, z);
    }
    gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridLines = new THREE.LineSegments(gridGeom, gridMat);
    scene.add(gridLines);

    // Axis labels
    const labelSize = maxScale * 0.16;
    const xLabel = createTextSprite(ranges.x.name, { color: "#888888" });
    xLabel.position.set(scale.x + maxScale * 0.08, 0, 0);
    xLabel.scale.set(labelSize, labelSize * 0.6, 1);
    scene.add(xLabel);

    const yLabel = createTextSprite(ranges.y.name, { color: "#888888" });
    yLabel.position.set(0, scale.y + maxScale * 0.08, 0);
    yLabel.scale.set(labelSize, labelSize * 0.6, 1);
    scene.add(yLabel);

    const zLabel = createTextSprite(ranges.z.name, { color: "#888888" });
    zLabel.position.set(0, 0, scale.z + maxScale * 0.08);
    zLabel.scale.set(labelSize * 1.6, labelSize * 0.6, 1);
    scene.add(zLabel);

    // Tick marks + numeric labels
    const tickSize = maxScale * 0.03;
    const tickMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.8 });
    const tickGeom = new THREE.BufferGeometry();
    const tickPositions: number[] = [];

    const addTick = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
        tickPositions.push(x1, y1, z1, x2, y2, z2);
    };

    const formatInt = (v: number) => String(Math.round(v));
    const labelStep = Math.max(1, Math.floor(labelEvery));

    // X ticks (along +X), with labels slightly below the axis (towards -Y)
    for (let x = 0; x <= Math.floor(scale.x); x += Math.max(1, Math.floor(tickStep))) {
        addTick(x, 0, 0, x, tickSize, 0);
        if (x % labelStep === 0) {
            const s = createTextSprite(formatInt(x), { color: "#d6d6d6", font: "bold 34px system-ui, Segoe UI, Arial" });
            s.position.set(x, 0, -tickSize * 1.6);
            s.scale.set(labelSize * 0.55, labelSize * 0.35, 1);
            scene.add(s);
        }
    }

    // Y ticks (along +Y), with labels slightly to the -X side
    for (let y = 0; y <= Math.floor(scale.y); y += Math.max(1, Math.floor(tickStep))) {
        addTick(0, y, 0, tickSize, y, 0);
        if (y % labelStep === 0) {
            const s = createTextSprite(formatInt(y), { color: "#d6d6d6", font: "bold 34px system-ui, Segoe UI, Arial" });
            s.position.set(-tickSize * 1.6, y, 0);
            s.scale.set(labelSize * 0.55, labelSize * 0.35, 1);
            scene.add(s);
        }
    }

    // Z ticks (along +Z), with labels slightly to the -X side
    for (let z = 0; z <= Math.floor(scale.z); z += Math.max(1, Math.floor(tickStep))) {
        addTick(0, 0, z, tickSize, 0, z);
        if (z % labelStep === 0) {
            const s = createTextSprite(formatInt(z), { color: "#d6d6d6", font: "bold 34px system-ui, Segoe UI, Arial" });
            s.position.set(-tickSize * 1.6, 0, z);
            s.scale.set(labelSize * 0.55, labelSize * 0.35, 1);
            scene.add(s);
        }
    }

    tickGeom.setAttribute("position", new THREE.Float32BufferAttribute(tickPositions, 3));
    const tickLines = new THREE.LineSegments(tickGeom, tickMat);
    scene.add(tickLines);
}