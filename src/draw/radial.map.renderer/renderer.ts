import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import type { RadialMapRendererOptions } from "./types.ts";
import type { Power2Graph, Power2Node, Power2NodeType } from "../../math/collatz.power2.types.ts";
import type { EnvelopeSegment } from "./envelope.ts";

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number): string =>
    String(n).split('').map(d => SUPER[+d]).join('');

const NODE_HEX: Record<Power2NodeType, number> = {
    power2:     0xFF8C00,
    center:     0xEA3A13,
    subcenterL: 0x8EF213,
    subcenterR: 0x13BEF2,
    regular:    0xc8c8c8,
};
const FORWARD_FILL_HEX = 0x8a7ac8;
const TRIPLE_EDGE_HEX  = 0xB45AFF;
const CYCLE_HEX        = 0x555555;

const GRADIENT_KEYS: [number, number, number][] = [
    [0x1a, 0x66, 0xff],
    [0x00, 0xdd, 0xdd],
    [0x00, 0xee, 0x44],
    [0xff, 0xee, 0x00],
    [0xff, 0x44, 0x00],
];

function stepsColor(t: number): number {
    const idx = Math.max(0, Math.min(1, t)) * (GRADIENT_KEYS.length - 1);
    const i = Math.min(Math.floor(idx), GRADIENT_KEYS.length - 2);
    const f = idx - i;
    const r = Math.round(GRADIENT_KEYS[i][0] * (1 - f) + GRADIENT_KEYS[i + 1][0] * f);
    const g = Math.round(GRADIENT_KEYS[i][1] * (1 - f) + GRADIENT_KEYS[i + 1][1] * f);
    const b = Math.round(GRADIENT_KEYS[i][2] * (1 - f) + GRADIENT_KEYS[i + 1][2] * f);
    return (r << 16) | (g << 8) | b;
}

const nodeSize = (type: Power2NodeType, depth: number): number => {
    if (type === 'power2')     return 6;
    if (type === 'center')     return 5;
    if (type === 'subcenterL') return 4.5;
    if (type === 'subcenterR') return 4.5;
    if (depth < 0) return 2;
    return Math.max(1.5, 3.5 - depth * 0.35);
};

const nodeAngle = (value: number, zone: number): number => {
    const lo = 2 ** zone;
    return -Math.PI / 2 + ((value - lo) / lo) * 2 * Math.PI;
};

interface Pt { x: number; y: number }

const DEFAULT_GRAPH_OPTIONS = {
    minZone: 2,
    maxZone: 14,
    maxInverseDepth: 12,
    maxNodes: 20_000,
    forwardFill: false,
    multiplier: 3,
    increment: 1,
} as const;

export function createRadialMapRenderer(
    parent: HTMLElement,
    options: RadialMapRendererOptions = {},
): () => void {
    const graphOpts = { ...DEFAULT_GRAPH_OPTIONS, ...options.graph };
    let destroyScene: (() => void) | null = null;

    const loader = document.createElement('div');
    loader.textContent = 'Building graph…';
    loader.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;' +
        'justify-content:center;color:#8888aa;font-family:monospace;font-size:14px;' +
        'pointer-events:none;';
    parent.style.position ||= 'relative';
    parent.appendChild(loader);

    const worker = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' },
    );

    const {
        ringSpacing: rs = 42,
        innerRadius: ir = 32,
        predictZones: pz = 0,
    } = options;

    worker.postMessage({ graphOpts, ringSpacing: rs, innerRadius: ir, predictZones: pz });
    worker.onmessage = (e) => {
        const raw = e.data as {
            zones: Power2Graph['zones'];
            edges: Power2Graph['edges'];
            nodes: [number, Power2Node][];
            multiplier: number;
            increment: number;
            envelope: EnvelopeSegment[];
            stoppingTimes: [number, number][];
        };
        const graph: Power2Graph = {
            zones: raw.zones,
            edges: raw.edges,
            nodes: new Map(raw.nodes),
            multiplier: raw.multiplier,
            increment: raw.increment,
        };
        const stoppingTimes = new Map<number, number>(raw.stoppingTimes);

        console.log(
            `Power2Graph: ${graph.nodes.size} nodes, ${graph.edges.length} edges`,
            graph.zones.map(z => `zone ${z.n}: ${(z.coverage * 100).toFixed(1)}%`),
        );

        loader.remove();
        destroyScene = initScene(parent, graph, raw.envelope, stoppingTimes, options);
        worker.terminate();
    };

    return () => {
        worker.terminate();
        loader.remove();
        destroyScene?.();
    };
}

/* ══════════════════════════════════════════════════════════════
   SCENE — everything that requires a built Power2Graph
   ══════════════════════════════════════════════════════════════ */

function initScene(
    parent: HTMLElement,
    graph: Power2Graph,
    envelope: EnvelopeSegment[],
    stoppingTimes: Map<number, number>,
    options: RadialMapRendererOptions,
): () => void {
    const {
        backgroundColor = 0x020304,
        ringSpacing     = 42,
        innerRadius     = 32,
        nodeBaseSize    = 1,
        edgeOpacity     = 0.12,
        edgeBow         = 0.65,
        showLabels      = true,
        showCoverage    = true,
        showDiv2Edges   = false,
    } = options;

    const q = graph.multiplier;
    const w = graph.increment;
    const minZone = graph.zones[0]?.n ?? 2;
    const ringR = (zone: number): number => innerRadius + (zone - minZone) * ringSpacing;

    /* ── pre-compute world positions ── */
    const positions = new Map<number, Pt>();
    for (const [value, node] of graph.nodes) {
        const r = ringR(node.zone);
        const a = nodeAngle(value, node.zone);
        positions.set(value, { x: r * Math.cos(a), y: r * Math.sin(a) });
    }

    /* ── Pixi application ── */
    const app = new PIXI.Application({
        resizeTo: parent,
        backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    parent.appendChild(app.view as HTMLCanvasElement);

    /* ── scene tree ── */
    const world   = new PIXI.Container();
    const overlay = new PIXI.Container();
    app.stage.addChild(world);
    app.stage.addChild(overlay);

    const guidesGfx    = new PIXI.Graphics();
    const edgesGfx     = new PIXI.Graphics();
    const envelopeGfx  = new PIXI.Graphics();
    const highlightGfx = new PIXI.Graphics();
    const nodesGfx     = new PIXI.Graphics();
    const labelsCtr    = new PIXI.Container();
    world.addChild(guidesGfx, edgesGfx, envelopeGfx, highlightGfx, nodesGfx, labelsCtr);

    const tooltipGfx = new PIXI.Graphics();
    const tooltipText = new PIXI.Text('', {
        fontFamily: 'monospace', fontSize: 12, fill: '#dddddd',
        lineHeight: 17, padding: 4,
    });
    tooltipText.visible = false;
    tooltipGfx.visible  = false;

    const legendCtr = new PIXI.Container();
    overlay.addChild(legendCtr, tooltipGfx, tooltipText);

    /* ══════════════════════════════════════════
       STATIC BUILDS (run once)
       ══════════════════════════════════════════ */

    function buildGuides(): void {
        const outerR = ringR(graph.zones[graph.zones.length - 1]?.n ?? minZone) + ringSpacing * 0.5;

        for (const z of graph.zones) {
            const r = ringR(z.n);
            if (showCoverage) {
                const { color, alpha } = coverageStyle(z.coverage);
                guidesGfx.lineStyle(1.5, color, alpha);
            } else {
                guidesGfx.lineStyle(1.5, 0xffffff, 0.08);
            }
            guidesGfx.drawCircle(0, 0, r);
        }

        guidesGfx.lineStyle(0.4, 0xffffff, 0.04);
        for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
            guidesGfx.moveTo(innerRadius * 0.5 * Math.cos(a), innerRadius * 0.5 * Math.sin(a));
            guidesGfx.lineTo(outerR * Math.cos(a), outerR * Math.sin(a));
        }
    }

    function buildEdges(): void {
        if (showDiv2Edges) {
            edgesGfx.lineStyle(0.5, 0xffffff, edgeOpacity * 0.25);
            for (const e of graph.edges) {
                if (e.type !== 'div2') continue;
                drawCurve(edgesGfx, e.from, e.to);
            }
        }

        edgesGfx.lineStyle(0.8, TRIPLE_EDGE_HEX, edgeOpacity * 0.4);
        for (const e of graph.edges) {
            if (e.type !== 'triple') continue;
            const fn = graph.nodes.get(e.from);
            if (fn && fn.depth >= 0) continue;
            drawCurve(edgesGfx, e.from, e.to);
        }

        edgesGfx.lineStyle(0.8, TRIPLE_EDGE_HEX, edgeOpacity);
        for (const e of graph.edges) {
            if (e.type !== 'triple') continue;
            const fn = graph.nodes.get(e.from);
            if (!fn || fn.depth < 0) continue;
            drawCurve(edgesGfx, e.from, e.to);
        }
    }

    function buildNodes(): void {
        const drawPrio = (d: number) => d < 0 ? 1000 : d;
        const sorted = [...graph.nodes.values()].sort(
            (a, b) => drawPrio(b.depth) - drawPrio(a.depth),
        );

        nodesGfx.lineStyle(0);

        for (const node of sorted) {
            if (node.type === 'regular') continue;
            const pos = positions.get(node.value);
            if (!pos) continue;
            const r = nodeSize(node.type, node.depth) * nodeBaseSize;
            nodesGfx.beginFill(NODE_HEX[node.type], 0.22);
            nodesGfx.drawCircle(pos.x, pos.y, r * 2.5);
            nodesGfx.endFill();
        }

        for (const node of sorted) {
            const pos = positions.get(node.value);
            if (!pos) continue;
            const r = nodeSize(node.type, node.depth) * nodeBaseSize;
            const hex = node.depth < 0 ? FORWARD_FILL_HEX : NODE_HEX[node.type];
            const alpha = node.type === 'regular'
                ? (node.depth < 0 ? 0.4 : Math.max(0.3, 1 - node.depth * 0.08))
                : 1;
            nodesGfx.beginFill(hex, alpha);
            nodesGfx.drawCircle(pos.x, pos.y, r);
            nodesGfx.endFill();
        }
    }

    /* ── stopping-time stats ── */
    let maxSteps = 0;
    for (const [, steps] of stoppingTimes) {
        const abs = Math.abs(steps);
        if (abs > maxSteps) maxSteps = abs;
    }

    const zoneAvgSteps = new Map<number, { avg: number; max: number; count: number; cycles: number }>();
    for (const z of graph.zones) {
        let sum = 0, cnt = 0, mx = 0, cyc = 0;
        for (const [val, node] of graph.nodes) {
            if (node.zone !== z.n) continue;
            const s = stoppingTimes.get(val) ?? 0;
            const abs = Math.abs(s);
            sum += abs; cnt++;
            if (abs > mx) mx = abs;
            if (s < 0) cyc++;
        }
        zoneAvgSteps.set(z.n, { avg: cnt > 0 ? sum / cnt : 0, max: mx, count: cnt, cycles: cyc });
    }

    console.group('Stopping-time statistics per zone');
    for (const [zn, stat] of zoneAvgSteps) {
        console.log(
            `zone ${zn}:  avg=${stat.avg.toFixed(1)}  max=${stat.max}  nodes=${stat.count}` +
            (stat.cycles > 0 ? `  cycles=${stat.cycles}` : ''),
        );
    }
    console.groupEnd();

    let stepsMode = false;

    function buildNodesSteps(): void {
        nodesGfx.clear();
        const cap = maxSteps || 1;

        const sorted = [...graph.nodes.values()].sort((a, b) => {
            const sa = Math.abs(stoppingTimes.get(a.value) ?? 0);
            const sb = Math.abs(stoppingTimes.get(b.value) ?? 0);
            return sa - sb;
        });

        nodesGfx.lineStyle(0);
        for (const node of sorted) {
            const pos = positions.get(node.value);
            if (!pos) continue;
            const steps = stoppingTimes.get(node.value) ?? 0;
            const abs = Math.abs(steps);
            const r = 2.5 * nodeBaseSize;
            nodesGfx.beginFill(stepsColor(abs / cap), 0.85);
            nodesGfx.drawCircle(pos.x, pos.y, r);
            nodesGfx.endFill();
            if (steps < 0) {
                nodesGfx.lineStyle(0.7, 0xffffff, 0.35);
                nodesGfx.drawCircle(pos.x, pos.y, r + 1.2);
                nodesGfx.lineStyle(0);
            }
        }
    }

    function buildLabels(): void {
        for (const z of graph.zones) {
            const r = ringR(z.n);
            let str = `2${sup(z.n)}`;
            if (showCoverage) str += `  ${(z.coverage * 100).toFixed(1)}%`;

            const label = new PIXI.Text(str, {
                fontFamily: 'monospace', fontSize: 11,
                fill: showCoverage ? coverageStyle(z.coverage).fillStr : '#ffffff',
            });
            label.alpha = 0.55;
            label.anchor.set(0.5, 1);
            label.position.set(0, -r - 4);
            labelsCtr.addChild(label);
        }
    }

    function buildLegend(): void {
        const stepLabel = `${q}n${w >= 0 ? '+' : ''}${w} edge`;
        const entries: [number | string, string][] = [
            [NODE_HEX.power2,     '2ⁿ'],
            [NODE_HEX.center,     'center 3·2ⁿ⁻¹'],
            [NODE_HEX.subcenterL, 'sub-L 5·2ⁿ⁻²'],
            [NODE_HEX.subcenterR, 'sub-R 7·2ⁿ⁻²'],
            [NODE_HEX.regular,    'inverse BFS'],
            [FORWARD_FILL_HEX,    'forward fill'],
            [TRIPLE_EDGE_HEX,     stepLabel],
            [0xFFD700,             'hover path'],
        ];

        const fs = 11;
        const lh = fs * 1.7;
        const pad = 8;

        const bg = new PIXI.Graphics();
        legendCtr.addChild(bg);

        let maxLabelW = 0;
        entries.forEach(([hex, label], i) => {
            const dot = new PIXI.Graphics();
            dot.beginFill(typeof hex === 'number' ? hex : 0xffffff, 0.85);
            dot.drawCircle(0, 0, fs * 0.32);
            dot.endFill();
            dot.position.set(pad + fs * 0.4, pad + lh * (i + 0.5));
            legendCtr.addChild(dot);

            const txt = new PIXI.Text(label, {
                fontFamily: 'monospace', fontSize: fs, fill: '#cccccc',
            });
            txt.anchor.set(0, 0.5);
            txt.position.set(pad * 2 + fs * 0.6, pad + lh * (i + 0.5));
            legendCtr.addChild(txt);
            if (txt.width > maxLabelW) maxLabelW = txt.width;
        });

        const bw = maxLabelW + pad * 3 + fs;
        const bh = entries.length * lh + pad * 2;
        bg.beginFill(0x000000, 0.7);
        bg.drawRoundedRect(0, 0, bw, bh, 6);
        bg.endFill();
    }

    /* ── curve helper ── */
    function drawCurve(gfx: PIXI.Graphics, fromVal: number, toVal: number): void {
        const a = positions.get(fromVal);
        const b = positions.get(toVal);
        if (!a || !b) return;
        gfx.moveTo(a.x, a.y);
        gfx.quadraticCurveTo(
            (a.x + b.x) / 2 * edgeBow,
            (a.y + b.y) / 2 * edgeBow,
            b.x, b.y,
        );
    }

    function coverageStyle(c: number): { color: number; alpha: number; fillStr: string } {
        const r = Math.round(255 * (1 - c) * 0.6);
        const g = Math.round(255 * c * 0.7);
        const b = 80;
        return {
            color: (r << 16) | (g << 8) | b,
            alpha: 0.15 + c * 0.15,
            fillStr: `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`,
        };
    }

    function drawSegments(segs: EnvelopeSegment[]): void {
        for (const seg of segs) {
            if (seg.points.length < 2) continue;
            envelopeGfx.moveTo(seg.points[0].x, seg.points[0].y);
            for (let i = 1; i < seg.points.length; i++) {
                envelopeGfx.lineTo(seg.points[i].x, seg.points[i].y);
            }
        }
    }

    function drawEnvelope(): void {
        const known = envelope.filter(s => !s.predicted);
        const predicted = envelope.filter(s => s.predicted);

        envelopeGfx.lineStyle(1.5, 0x00FFCC, 0.7);
        drawSegments(known);

        if (predicted.length > 0) {
            envelopeGfx.lineStyle(1.2, 0xFF3333, 0.7);
            drawSegments(predicted);
        }

        const tag = (s: EnvelopeSegment) => s.predicted ? ' [predicted]' : '';
        console.group(`Envelope of Collatz caustic  (${q}n + ${w})`);
        console.log('β = k·α + φ   where k = q / 2^j');
        console.log('Parametric:');
        console.log('  γ(α) = (k−1)·α + φ');
        console.log('  t(α) = R₁·(R₂·cos γ − R₁) / [R₁·R₂·(k+1)·cos γ − R₁² − k·R₂²]');
        console.log('  x(α) = (1−t)·R₁·cos α + t·R₂·cos(kα+φ)');
        console.log('  y(α) = (1−t)·R₁·sin α + t·R₂·sin(kα+φ)');
        console.log('');
        for (const seg of envelope) {
            console.log(
                `  zone ${seg.srcZone} → ${seg.dstZone}:  k=${seg.k.toFixed(4)}  φ=${seg.phi.toFixed(4)} rad  ${seg.points.length} pts${tag(seg)}`,
            );
        }
        console.log('Raw data:', envelope);
        console.groupEnd();
    }

    /* ══════════════════════════════════════════
       RUN STATIC BUILDS
       ══════════════════════════════════════════ */
    buildGuides();
    buildEdges();
    drawEnvelope();
    buildNodes();
    if (showLabels) buildLabels();
    buildLegend();

    /* ══════════════════════════════════════════
       INTERACTION STATE
       ══════════════════════════════════════════ */
    let zoom = 1;
    let cx = app.screen.width / 2;
    let cy = app.screen.height / 2;
    let hovered: Power2Node | null = null;
    let prevHovered: Power2Node | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let lastZoom = zoom;
    let dirty = true;
    let dragging = false;
    let dragSX = 0, dragSY = 0, dragCX = 0, dragCY = 0;

    /* ── initial fit to full zone range ── */
    const lastN = graph.zones[graph.zones.length - 1]?.n ?? minZone;
    const focusR = ringR(lastN) + ringSpacing;
    zoom = Math.min(app.screen.width, app.screen.height) / (focusR * 2.3);
    lastZoom = zoom;
    applyWorldTransform();
    positionLegend();

    function applyWorldTransform(): void {
        world.position.set(cx, cy);
        world.scale.set(zoom);
    }

    function syncLabelScale(): void {
        for (const child of labelsCtr.children) {
            child.scale.set(1 / zoom);
        }
    }

    function positionLegend(): void {
        legendCtr.position.set(app.screen.width - legendCtr.width - 10, 10);
    }

    function screenToWorld(sx: number, sy: number): Pt {
        return { x: (sx - cx) / zoom, y: (sy - cy) / zoom };
    }

    /* ── hover helpers ── */
    function findNearest(wx: number, wy: number): Power2Node | null {
        let best: Power2Node | null = null;
        let bestD2 = (20 / zoom) ** 2;
        for (const [val, pos] of positions) {
            const dx = pos.x - wx;
            const dy = pos.y - wy;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; best = graph.nodes.get(val)!; }
        }
        return best;
    }

    function updateHighlight(): void {
        highlightGfx.clear();
        if (!hovered) return;

        const chain: number[] = [];
        let cur = hovered.value;
        const visited = new Set<number>();
        while (cur > 0 && Number.isSafeInteger(cur) && !visited.has(cur) && chain.length < 500) {
            chain.push(cur);
            visited.add(cur);
            cur = cur % 2 === 0 ? cur / 2 : q * cur + w;
        }

        const lw = Math.max(1.2, 2.5 / zoom);
        for (let i = 0; i < chain.length - 1; i++) {
            const a = positions.get(chain[i]);
            const b = positions.get(chain[i + 1]);
            if (!a || !b) continue;
            const t = i / (chain.length - 1);
            highlightGfx.lineStyle(lw, 0xFFD700, 0.9 - t * 0.5);
            highlightGfx.moveTo(a.x, a.y);
            highlightGfx.quadraticCurveTo(
                (a.x + b.x) / 2 * edgeBow,
                (a.y + b.y) / 2 * edgeBow,
                b.x, b.y,
            );
        }

        const dotR = Math.max(1.5, 3.5 / zoom);
        highlightGfx.lineStyle(0);
        highlightGfx.beginFill(0xFFD700, 0.55);
        for (const v of chain) {
            const p = positions.get(v);
            if (p) highlightGfx.drawCircle(p.x, p.y, dotR);
        }
        highlightGfx.endFill();
    }

    function updateTooltip(): void {
        if (!hovered) {
            tooltipGfx.visible = false;
            tooltipText.visible = false;
            return;
        }

        const pad = 8;
        const next = hovered.value % 2 === 0 ? hovered.value / 2 : q * hovered.value + w;
        const steps = stoppingTimes.get(hovered.value) ?? 0;
        const stepsStr = steps >= 0
            ? `${steps} → 1`
            : `${Math.abs(steps)} → cycle`;
        const body = [
            `${hovered.value}`,
            `zone ${hovered.zone}  (2${sup(hovered.zone)}–2${sup(hovered.zone + 1)})`,
            `type: ${hovered.type}`,
            `depth: ${hovered.depth}`,
            `trajectory: ${stepsStr}`,
            `→ ${next}`,
        ].join('\n');

        tooltipText.text = body;
        tooltipText.visible = true;

        const tw = tooltipText.width + pad * 2;
        const th = tooltipText.height + pad * 2;
        const bx = Math.min(mouseX + 14, app.screen.width - tw - 4);
        const by = Math.max(4, mouseY - th - 8);

        tooltipGfx.clear();
        tooltipGfx.beginFill(0x000000, 0.88);
        tooltipGfx.drawRoundedRect(bx, by, tw, th, 6);
        tooltipGfx.endFill();
        tooltipGfx.visible = true;

        tooltipText.position.set(bx + pad, by + pad);
    }

    /* ══════════════════════════════════════════
       GSAP TICKER
       ══════════════════════════════════════════ */
    const tick = (): void => {
        if (!dirty) return;
        dirty = false;

        if (zoom !== lastZoom) {
            syncLabelScale();
            lastZoom = zoom;
        }

        const wpt = screenToWorld(mouseX, mouseY);
        hovered = dragging ? null : findNearest(wpt.x, wpt.y);
        if (hovered !== prevHovered) {
            updateHighlight();
            updateTooltip();
            prevHovered = hovered;
        }
    };
    gsap.ticker.add(tick);

    /* ══════════════════════════════════════════
       EVENT HANDLERS
       ══════════════════════════════════════════ */
    const view = app.view as HTMLCanvasElement;

    const onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const mx = e.offsetX;
        const my = e.offsetY;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const wx = (mx - cx) / zoom;
        const wy = (my - cy) / zoom;
        zoom *= factor;
        cx = mx - wx * zoom;
        cy = my - wy * zoom;
        applyWorldTransform();
        dirty = true;
    };

    const onDown = (e: MouseEvent): void => {
        dragging = true;
        dragSX = e.offsetX;
        dragSY = e.offsetY;
        dragCX = cx;
        dragCY = cy;
        view.style.cursor = 'grabbing';
    };

    const onMove = (e: MouseEvent): void => {
        mouseX = e.offsetX;
        mouseY = e.offsetY;

        if (dragging) {
            cx = dragCX + (mouseX - dragSX);
            cy = dragCY + (mouseY - dragSY);
            applyWorldTransform();
        }

        view.style.cursor = dragging ? 'grabbing' : (hovered ? 'pointer' : 'grab');
        dirty = true;
    };

    const onUp = (): void => {
        dragging = false;
        view.style.cursor = hovered ? 'pointer' : 'grab';
    };

    const onResize = (): void => {
        positionLegend();
        dirty = true;
    };

    view.addEventListener('wheel', onWheel, { passive: false });
    view.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onResize);
    view.style.cursor = 'grab';

    syncLabelScale();

    /* ══════════════════════════════════════════
       EDGE ANIMATION
       ══════════════════════════════════════════ */
    const animEdges = graph.edges
        .filter(e => showDiv2Edges || e.type === 'triple')
        .sort((a, b) => {
            const za = graph.nodes.get(a.from)?.zone ?? 0;
            const zb = graph.nodes.get(b.from)?.zone ?? 0;
            return za - zb || a.from - b.from;
        });

    let animTween: gsap.core.Tween | null = null;

    const animBtn = document.createElement('button');
    animBtn.textContent = '▶  Animate';
    animBtn.style.cssText =
        'position:absolute;bottom:12px;left:12px;padding:6px 14px;' +
        'background:#1a1a2e;color:#aaa;border:1px solid #333;border-radius:4px;' +
        'font-family:monospace;font-size:12px;cursor:pointer;z-index:10;' +
        'transition:background .15s,color .15s;';
    animBtn.onmouseenter = () => { animBtn.style.background = '#2a2a4e'; animBtn.style.color = '#ddd'; };
    animBtn.onmouseleave = () => { animBtn.style.background = '#1a1a2e'; animBtn.style.color = '#aaa'; };
    parent.appendChild(animBtn);

    const causticBtn = document.createElement('button');
    causticBtn.textContent = '◉  Caustic';
    causticBtn.style.cssText =
        'position:absolute;bottom:12px;left:130px;padding:6px 14px;' +
        'background:#1a1a2e;color:#aaa;border:1px solid #333;border-radius:4px;' +
        'font-family:monospace;font-size:12px;cursor:pointer;z-index:10;' +
        'transition:background .15s,color .15s;';
    causticBtn.onmouseenter = () => { causticBtn.style.background = '#2a2a4e'; causticBtn.style.color = '#ddd'; };
    causticBtn.onmouseleave = () => { if (!envelopeGfx.visible) { causticBtn.style.background = '#1a1a2e'; causticBtn.style.color = '#aaa'; } };
    causticBtn.addEventListener('click', () => {
        envelopeGfx.visible = !envelopeGfx.visible;
        causticBtn.style.background = envelopeGfx.visible ? '#0a2a2a' : '#1a1a2e';
        causticBtn.style.color = envelopeGfx.visible ? '#00FFCC' : '#aaa';
        causticBtn.style.borderColor = envelopeGfx.visible ? '#00FFCC55' : '#333';
    });
    parent.appendChild(causticBtn);

    /* ── Steps toggle button ── */
    const stepsBtn = document.createElement('button');
    stepsBtn.textContent = '⏱  Steps';
    stepsBtn.style.cssText =
        'position:absolute;bottom:12px;left:248px;padding:6px 14px;' +
        'background:#1a1a2e;color:#aaa;border:1px solid #333;border-radius:4px;' +
        'font-family:monospace;font-size:12px;cursor:pointer;z-index:10;' +
        'transition:background .15s,color .15s;';
    stepsBtn.onmouseenter = () => { stepsBtn.style.background = '#2a2a4e'; stepsBtn.style.color = '#ddd'; };
    stepsBtn.onmouseleave = () => {
        if (!stepsMode) { stepsBtn.style.background = '#1a1a2e'; stepsBtn.style.color = '#aaa'; }
    };

    /* ── gradient bar (shows in steps mode) ── */
    const gradientBar = document.createElement('div');
    gradientBar.style.cssText =
        'position:absolute;bottom:44px;left:248px;width:110px;height:14px;border-radius:3px;' +
        'border:1px solid #333;z-index:10;display:none;' +
        'background:linear-gradient(90deg,#1a66ff,#00dddd,#00ee44,#ffee00,#ff4400);';
    const gradLabelMin = document.createElement('span');
    gradLabelMin.textContent = '0';
    gradLabelMin.style.cssText =
        'position:absolute;bottom:60px;left:248px;font-family:monospace;font-size:10px;' +
        'color:#aaa;z-index:10;display:none;';
    const gradLabelMax = document.createElement('span');
    gradLabelMax.textContent = String(maxSteps);
    gradLabelMax.style.cssText =
        'position:absolute;bottom:60px;left:336px;font-family:monospace;font-size:10px;' +
        'color:#aaa;z-index:10;display:none;text-align:right;';
    parent.appendChild(gradientBar);
    parent.appendChild(gradLabelMin);
    parent.appendChild(gradLabelMax);

    stepsBtn.addEventListener('click', () => {
        stepsMode = !stepsMode;
        stepsBtn.style.background = stepsMode ? '#2a1a0a' : '#1a1a2e';
        stepsBtn.style.color = stepsMode ? '#ffaa44' : '#aaa';
        stepsBtn.style.borderColor = stepsMode ? '#ffaa4455' : '#333';
        gradientBar.style.display = stepsMode ? 'block' : 'none';
        gradLabelMin.style.display = stepsMode ? 'block' : 'none';
        gradLabelMax.style.display = stepsMode ? 'block' : 'none';

        if (stepsMode) {
            buildNodesSteps();
        } else {
            nodesGfx.clear();
            buildNodes();
        }
    });
    parent.appendChild(stepsBtn);

    function edgeStyle(e: typeof animEdges[0]): void {
        const fn = graph.nodes.get(e.from);
        if (e.type === 'div2') {
            edgesGfx.lineStyle(0.5, 0xffffff, edgeOpacity * 0.25);
        } else if (fn && fn.depth < 0) {
            edgesGfx.lineStyle(0.8, TRIPLE_EDGE_HEX, edgeOpacity * 0.4);
        } else {
            edgesGfx.lineStyle(0.8, TRIPLE_EDGE_HEX, edgeOpacity);
        }
    }

    const edgesPerZone = new Map<number, number>();
    for (const e of animEdges) {
        const z = graph.nodes.get(e.from)?.zone ?? 0;
        edgesPerZone.set(z, (edgesPerZone.get(z) ?? 0) + 1);
    }

    const zoneLabels = new Map<number, PIXI.Text>();
    for (let i = 0; i < graph.zones.length; i++) {
        const label = labelsCtr.children[i] as PIXI.Text | undefined;
        if (label) zoneLabels.set(graph.zones[i].n, label);
    }

    function setLabelCoverage(zone: number, ratio: number): void {
        const label = zoneLabels.get(zone);
        if (!label || !showCoverage) return;
        const pct = (ratio * 100).toFixed(1);
        const { fillStr } = coverageStyle(ratio);
        label.text = `2${sup(zone)}  ${pct}%`;
        label.style.fill = fillStr;
    }

    function resetLabels(): void {
        for (const z of graph.zones) {
            setLabelCoverage(z.n, 0);
        }
    }

    function restoreLabels(): void {
        for (const z of graph.zones) {
            setLabelCoverage(z.n, z.coverage);
        }
    }

    const zoneFinalCov = new Map<number, number>();
    for (const z of graph.zones) zoneFinalCov.set(z.n, z.coverage);

    animBtn.addEventListener('click', () => {
        if (animTween) { animTween.kill(); animTween = null; }

        edgesGfx.clear();
        resetLabels();
        let drawn = 0;
        const total = animEdges.length;
        const state = { p: 0 };
        const drawnPerZone = new Map<number, number>();

        animTween = gsap.to(state, {
            p: total,
            duration: Math.max(3, total / 4000),
            ease: 'none',
            onUpdate() {
                const target = Math.min(Math.floor(state.p), total);
                for (; drawn < target; drawn++) {
                    const e = animEdges[drawn];
                    edgeStyle(e);
                    drawCurve(edgesGfx, e.from, e.to);

                    const z = graph.nodes.get(e.from)?.zone ?? 0;
                    const count = (drawnPerZone.get(z) ?? 0) + 1;
                    drawnPerZone.set(z, count);
                    const zoneTotal = edgesPerZone.get(z) ?? 1;
                    const realCov = zoneFinalCov.get(z) ?? 1;
                    setLabelCoverage(z, realCov * (count / zoneTotal));
                }
            },
            onComplete() {
                restoreLabels();
                animTween = null;
            },
        });
    });

    /* ══════════════════════════════════════════
       CLEANUP
       ══════════════════════════════════════════ */
    return () => {
        animTween?.kill();
        animBtn.remove();
        causticBtn.remove();
        stepsBtn.remove();
        gradientBar.remove();
        gradLabelMin.remove();
        gradLabelMax.remove();
        gsap.ticker.remove(tick);
        view.removeEventListener('wheel', onWheel);
        view.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('resize', onResize);
        app.destroy(true, { children: true, texture: true });
    };
}
