import type { BinaryWalkRendererOptions } from "./types.ts";

interface Point { x: number; y: number }

function numbersToBits(numbers: number[]): number[] {
    const bits: number[] = [];
    for (const n of numbers) {
        const bin = n.toString(2);
        for (const ch of bin) {
            bits.push(ch === "1" ? 1 : 0);
        }
    }
    return bits;
}

function computePath(bits: number[], stepLength: number, turnAngleRad: number): Point[] {
    const path: Point[] = [];
    let x = 0;
    let y = 0;
    let angle = 0;

    path.push({ x, y });

    for (const bit of bits) {
        if (bit === 1) {
            angle += turnAngleRad;
        }
        x += Math.cos(angle) * stepLength;
        y += Math.sin(angle) * stepLength;
        path.push({ x, y });
    }

    return path;
}

function getBounds(path: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of path) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
}

const GRADIENT_STOPS: [number, [number, number, number]][] = [
    [0.00, [191,   0, 255]],
    [0.25, [145,   0,  72]],
    [0.50, [255, 140,   0]],
    [0.75, [255, 255,   0]],
    [1.00, [255, 255, 255]],
];

function gradientColor(t: number): string {
    const x = Math.min(1, Math.max(0, t));
    let i = 0;
    while (i < GRADIENT_STOPS.length - 2 && GRADIENT_STOPS[i + 1][0] < x) i++;
    const [t0, c0] = GRADIENT_STOPS[i];
    const [t1, c1] = GRADIENT_STOPS[i + 1];
    const f = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
    return `rgb(${r},${g},${b})`;
}

export function createBinaryWalkRenderer(
    parent: HTMLElement,
    oddNumbers: number[],
    options: BinaryWalkRendererOptions = {}
): () => void {
    const {
        stepLength = 2,
        lineWidth = 1,
        lineColor = "#bf00ff",
        lineOpacity = 1,
        backgroundColor = "#020304",
        useGradient = true,
        turnAngleDeg = 45,
    } = options;

    const turnAngleRad = (turnAngleDeg * Math.PI) / 180;
    const bits = numbersToBits(oddNumbers);
    const path = computePath(bits, stepLength, turnAngleRad);

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    parent.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;

    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let disposed = false;

    function fitToCanvas() {
        const bounds = getBounds(path);
        const pathW = bounds.maxX - bounds.minX || 1;
        const pathH = bounds.maxY - bounds.minY || 1;
        const padding = 40;
        const scaleX = (canvas.width - padding * 2) / pathW;
        const scaleY = (canvas.height - padding * 2) / pathH;
        zoom = Math.min(scaleX, scaleY);
        panX = canvas.width / 2 - (bounds.minX + pathW / 2) * zoom;
        panY = canvas.height / 2 - (bounds.minY + pathH / 2) * zoom;
    }

    function draw() {
        if (disposed) return;

        const w = canvas.clientWidth * devicePixelRatio;
        const h = canvas.clientHeight * devicePixelRatio;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        ctx.lineWidth = lineWidth / zoom;
        ctx.globalAlpha = lineOpacity;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (useGradient) {
            const total = path.length - 1;
            for (let i = 0; i < total; i++) {
                ctx.strokeStyle = gradientColor(i / total);
                ctx.beginPath();
                ctx.moveTo(path[i].x, path[i].y);
                ctx.lineTo(path[i + 1].x, path[i + 1].y);
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- pan & zoom ---

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panStartX = 0;
    let panStartY = 0;

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * devicePixelRatio;
        const my = (e.clientY - rect.top) * devicePixelRatio;

        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newZoom = zoom * factor;

        panX = mx - (mx - panX) * (newZoom / zoom);
        panY = my - (my - panY) * (newZoom / zoom);
        zoom = newZoom;

        draw();
    };

    const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        dragStartX = e.clientX * devicePixelRatio;
        dragStartY = e.clientY * devicePixelRatio;
        panStartX = panX;
        panStartY = panY;
        canvas.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX * devicePixelRatio - dragStartX;
        const dy = e.clientY * devicePixelRatio - dragStartY;
        panX = panStartX + dx;
        panY = panStartY + dy;
        draw();
    };

    const onMouseUp = () => {
        isDragging = false;
        canvas.style.cursor = "grab";
    };

    const onResize = () => {
        draw();
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", onResize);
    canvas.style.cursor = "grab";

    fitToCanvas();
    draw();

    return () => {
        disposed = true;
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("resize", onResize);
    };
}
