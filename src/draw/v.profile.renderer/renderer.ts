import type {
    CollatzRendererGridData,
    CollatzRendererInitialConfig, CollatzRendererPixiData,
    CollatzRendererUpdateConfig,
} from "./types.ts";
import * as PIXI from "pixi.js";
import type {VProfile} from "../../math";
type ViewBounds = { maxX: number; maxY: number };
type PlotSpec = {
    // points in "data units" (not pixels)
    data: PIXI.Point[];
    bounds: ViewBounds;
    xTitle: string;
    yTitle: string;
};

const rendererIs: Record<string, boolean> = {
    init: false
};

const rendererPixi: CollatzRendererPixiData = {
    app: null,
    grid: null,
    numberPath: null,
    gridMeasurementMarks: null,
};

const rendererGrid: CollatzRendererGridData = {
    scales: {
        // pixels per 1 unit along axes:
        ribs: 15,          // X scale (v2)
        sequenceGrow: 50,  // Y scale (v3)
    },
    ribs: {
        twoPowN: {
            // style bucket used for major grid lines / axis
            count: 40,
            color: 0xffffff,
            alpha: 0.55,
            values: []
        },
        threeExp: {
            // style bucket used for minor grid lines
            count: 40,
            color: 0xffffff,
            alpha: 0.18,
            values: []
        },
    },
};

let lastBounds: ViewBounds = { maxX: 20, maxY: 6 };

export const initRenderer = (config: CollatzRendererInitialConfig): void => {
    if (rendererIs.init) {
        return;
    }

    _createPixiApp(config.parent ?? document.body);
    _createLayers();
    _redrawGrid(lastBounds);

    // rendererPixi.app!.renderer.on("resize", () => {
    //     _redrawGrid(lastBounds);
    // });

    rendererIs.init = true;
};

export const updateRenderer = (config: CollatzRendererUpdateConfig): void => {
    if (!rendererIs.init || !config.sequence) {
        return;
    }

    const {numberPath} = rendererPixi;
    const color: number = _resolveColor((config as unknown as { color?: unknown }).color);

    if (config.clearBefore) {
        numberPath!.clear();
    }

    const plot = _buildPlot(config.sequence);
    lastBounds = plot.bounds;
    _redrawGrid(plot.bounds, plot.xTitle, plot.yTitle);

    const pixiPath: PIXI.Point[] = plot.data.map(_toPixiPoint);

    // Draw as points (scatter), not a connected curve.
    const radius = 5;
    numberPath!.beginFill(color, 0.95);
    for (const p of pixiPath) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        numberPath!.drawCircle(p.x, p.y, radius);
    }
    numberPath!.endFill();
};

const _resolveColor = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const s = value.trim().toLowerCase();
        // "#rrggbb"
        if (s.startsWith("#")) {
            const hex = s.slice(1);
            if (/^[0-9a-f]{6}$/.test(hex)) return parseInt(hex, 16);
        }
        // "0xrrggbb" or "rrggbb"
        const hex = s.startsWith("0x") ? s.slice(2) : s;
        if (/^[0-9a-f]{6}$/.test(hex)) return parseInt(hex, 16);
    }

    return _getRandomColor();
};

const _createPixiApp = (parent: HTMLElement): void => {
    rendererPixi.app = new PIXI.Application({
        resizeTo: parent,
        backgroundColor: 0x000011,
        antialias: true,
        backgroundAlpha: 1,
        resolution: window.devicePixelRatio || 1,
    });

    // PIXI types `view` as ICanvas, but DOM expects Node/HTMLElement.
    parent.appendChild(rendererPixi.app!.view as unknown as HTMLElement);
};

const _createLayers = (): void => {
    rendererPixi.grid = new PIXI.Graphics();
    rendererPixi.numberPath = new PIXI.Graphics();
    rendererPixi.gridMeasurementMarks = new PIXI.Container();

    rendererPixi.app!.stage.addChild(rendererPixi.grid!);
    rendererPixi.app!.stage.addChild(rendererPixi.numberPath!);
    rendererPixi.app!.stage.addChild(rendererPixi.gridMeasurementMarks!);
};

const _clearMarks = (): void => {
    const container = rendererPixi.gridMeasurementMarks!;
    for (const child of container.removeChildren()) {
        child.destroy({ children: true });
    }
};

const _origin = (): PIXI.Point => {
    const app = rendererPixi.app!;
    const paddingLeft = 40;
    const paddingBottom = 30;
    return new PIXI.Point(paddingLeft, app.screen.height - paddingBottom);
};

const _toPixiPoint = (p: PIXI.Point): PIXI.Point => {
    const { scales } = rendererGrid;
    const o = _origin();
    return new PIXI.Point(o.x + p.x * scales.ribs, o.y - p.y * scales.sequenceGrow);
};

const _calcBoundsFromData = (points: PIXI.Point[]): ViewBounds => {
    let maxX = 0;
    let maxY = 0;

    for (const p of points) {
        if (Number.isFinite(p.x) && p.x > maxX) maxX = p.x;
        if (Number.isFinite(p.y) && p.y > maxY) maxY = p.y;
    }

    return {
        maxX: Math.max(5, Math.ceil(maxX)),
        maxY: Math.max(3, Math.ceil(maxY)),
    };
};

/**
 * Default: plot in (v2, v3) plane.
 * If v3 is constant (or effectively constant), auto-switch to (index, v2)
 * so the result is not a visually-degenerate straight line.
 */
const _buildPlot = (vProfile: VProfile[]): PlotSpec => {
    if (vProfile.length === 0) {
        return { data: [], bounds: { maxX: 5, maxY: 3 }, xTitle: "x", yTitle: "y" };
    }

    let maxV2 = 0;
    let maxV3 = 0;
    let nonZeroV3 = 0;
    for (const p of vProfile) {
        if (p.v2 > maxV2) maxV2 = p.v2;
        if (p.v3 > maxV3) maxV3 = p.v3;
        if (p.v3 !== 0) nonZeroV3++;
    }

    const data = vProfile.map((p) => new PIXI.Point(p.v2, p.v3));
    return {
        data,
        bounds: _calcBoundsFromData(data),
        xTitle: "v2",
        yTitle: "v3",
    };
};


const _drawText = (
    textValue: string,
    x: number,
    y: number,
    {
        color = 0xffffff,
        alpha = 0.9,
        fontSize = 10,
        anchorX = 0.5,
        anchorY = 0.5,
    }: {
        color?: number;
        alpha?: number;
        fontSize?: number;
        anchorX?: number;
        anchorY?: number;
    } = {}
): void => {
    const text = new PIXI.Text(textValue, {
        fill: `#${color.toString(16).padStart(6, "0")}`,
        fontSize,
    });
    text.alpha = alpha;
    text.anchor.set(anchorX, anchorY);
    text.x = x;
    text.y = y;
    rendererPixi.gridMeasurementMarks!.addChild(text);
};

const _redrawGrid = (bounds: ViewBounds, xTitle = "v2", yTitle = "v3"): void => {
    const { ribs } = rendererGrid;
    const grid = rendererPixi.grid!;

    grid.clear();
    _clearMarks();

    const o = _origin();

    const xMaxPixi = _toPixiPoint(new PIXI.Point(bounds.maxX, 0)).x;
    const yMaxPixi = _toPixiPoint(new PIXI.Point(0, bounds.maxY)).y;

    const axisColor = ribs.twoPowN.color;
    const axisAlpha = 0.9;

    // Minor grid lines (every 1 unit)
    grid.lineStyle(1, ribs.threeExp.color, ribs.threeExp.alpha);

    for (let x = 0; x <= bounds.maxX; x++) {
        const px = _toPixiPoint(new PIXI.Point(x, 0)).x;
        grid.moveTo(px, o.y);
        grid.lineTo(px, yMaxPixi);
    }

    for (let y = 0; y <= bounds.maxY; y++) {
        const py = _toPixiPoint(new PIXI.Point(0, y)).y;
        grid.moveTo(o.x, py);
        grid.lineTo(xMaxPixi, py);
    }

    // Major grid lines (every 5 units)
    const majorStep = 5;
    grid.lineStyle(1, ribs.twoPowN.color, ribs.twoPowN.alpha);

    for (let x = 0; x <= bounds.maxX; x += majorStep) {
        const px = _toPixiPoint(new PIXI.Point(x, 0)).x;
        grid.moveTo(px, o.y);
        grid.lineTo(px, yMaxPixi);
    }

    for (let y = 0; y <= bounds.maxY; y += majorStep) {
        const py = _toPixiPoint(new PIXI.Point(0, y)).y;
        grid.moveTo(o.x, py);
        grid.lineTo(xMaxPixi, py);
    }

    // Axes (X bottom, Y left)
    grid.lineStyle(2, axisColor, axisAlpha);

    grid.moveTo(o.x, o.y);
    grid.lineTo(xMaxPixi, o.y); // X axis

    grid.moveTo(o.x, o.y);
    grid.lineTo(o.x, yMaxPixi); // Y axis (up)

    // Tick marks + labels from 0..max (start at 0 and go further)
    const tickSize = 4;
    const labelOffset = 10;

    // X ticks/labels along bottom axis
    grid.lineStyle(2, axisColor, axisAlpha);
    for (let x = 0; x <= bounds.maxX; x++) {
        const px = _toPixiPoint(new PIXI.Point(x, 0)).x;
        grid.moveTo(px, o.y);
        grid.lineTo(px, o.y + tickSize);

        if (x === 0 || x % majorStep === 0) {
            _drawText(`${x}`, px, o.y + labelOffset, { color: axisColor, alpha: 0.85, anchorX: 0.5, anchorY: 0 });
        }
    }

    // Y ticks/labels along left axis
    for (let y = 0; y <= bounds.maxY; y++) {
        const py = _toPixiPoint(new PIXI.Point(0, y)).y;
        grid.moveTo(o.x - tickSize, py);
        grid.lineTo(o.x, py);

        if (y === 0 || y % majorStep === 0) {
            _drawText(`${y}`, o.x - labelOffset, py, { color: axisColor, alpha: 0.85, anchorX: 1, anchorY: 0.5 });
        }
    }

    // axis titles (optional, subtle)
    _drawText(xTitle, xMaxPixi + 10, o.y + 2, { color: axisColor, alpha: 0.5, anchorX: 0, anchorY: 0.5 });
    _drawText(yTitle, o.x - 2, yMaxPixi - 10, { color: axisColor, alpha: 0.5, anchorX: 0.5, anchorY: 1 });
};

const _getRandomColor = (): number => {
    return Math.floor(Math.random() * 0xffffff);
};