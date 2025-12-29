import type {
    CollatzRendererGridData, CollatzRendererGridRibsConfig,
    CollatzRendererInitialConfig, CollatzRendererPixiData,
    CollatzRendererUpdateConfig,
    ICollatzRenderer
} from "./types.ts";
import * as PIXI from "pixi.js";

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
        ribs: 0.012,
        sequenceGrow: 7,
    },
    ribs: {
        twoPowN: {
            count: 40,
            color: 0xffffff,
            alpha: 0.45,
            values: []
        },
        threeExp: {
            count: 40,
            color: 0xffffff,
            alpha: 0.25,
            values: []
        },
    },
};

const renderer: ICollatzRenderer = {
    is: rendererIs,
    pixi: rendererPixi,
    grid: rendererGrid,
};

export const initRenderer = (config: CollatzRendererInitialConfig): void => {
    if (rendererIs.init) {
        return;
    }

    _calcRibsValues();
    _createPixiApp(config.parent ?? document.body);
    _createGrid();

    rendererIs.init = true;
};

export const updateRenderer = (config: CollatzRendererUpdateConfig): void => {
    if (!rendererIs.init || !config.sequence) {
        return;
    }

    const path = _calcNumberPath(config.sequence);
    const {numberPath} = rendererPixi;
    const color: number = config.color ?? _getRandomColor();

    if (config.clearBefore) {
        numberPath!.clear();
    }

    numberPath!.lineStyle(1, color, 1);

    path
        .forEach((value, index, array) => {
            numberPath!.moveTo(value.x, value.y);

            if (index < array.length - 1) {
                numberPath!.lineTo(array[index + 1].x, array[index + 1].y);
            }
        });
};

const _createPixiApp = (parent: HTMLElement): void => {
    rendererPixi.app = new PIXI.Application({
        resizeTo: parent,
        backgroundColor: 0x000011,
        antialias: true,
        backgroundAlpha: 1,
        resolution: window.devicePixelRatio || 1,
    });

    parent.appendChild(rendererPixi.app!.view as HTMLElement);
};

const _calcRibsValues = (): void => {
    const { ribs } = rendererGrid;

    for (let n: number = 1; n <= ribs.twoPowN.count; n++) {
        ribs.twoPowN.values.push(Math.pow(2, n));
    }

    for (let n: number = 1; n <= ribs.threeExp.count; n++) {
        ribs.threeExp.values.push(3 * Math.pow(2, n - 1));
    }
};

const _createGrid = (): void => {

    const { ribs, scales } = rendererGrid;

    rendererPixi.grid = new PIXI.Graphics();
    rendererPixi.numberPath = new PIXI.Graphics();
    rendererPixi.gridMeasurementMarks = new PIXI.Container();

    rendererPixi.grid.y = 15;
    rendererPixi.numberPath.y = 15;

    const { grid } = rendererPixi;

    rendererPixi.app!.stage.addChild(grid!);
    rendererPixi.app!.stage.addChild(rendererPixi.numberPath!);
    rendererPixi.app!.stage.addChild(rendererPixi.gridMeasurementMarks!);

    //

    grid!.lineStyle(1, ribs.twoPowN.color, ribs.twoPowN.alpha);

    const drawGridLine = (value: number, ribsConfig: CollatzRendererGridRibsConfig): void => {
        const x: number = value * scales.ribs;

        const text: PIXI.Text = new PIXI.Text(`${value}`, {
            fill: `#${ribsConfig.color.toString(16)}`,
            fontSize: 10,
        });

        text.alpha = ribsConfig.alpha;

        text.anchor.set(0.5, 0.5);
        text.x = x;
        text.y = 7;

        grid!.moveTo(x, 0);
        grid!.lineTo(x, 1_000);

        rendererPixi.gridMeasurementMarks!.addChild(text);
    };

    for (const value of ribs.twoPowN.values) {
        drawGridLine(value, ribs.twoPowN);
    }

    //

    grid!.lineStyle(1, ribs.threeExp.color, ribs.threeExp.alpha);

    for (const value of ribs.threeExp.values) {
        drawGridLine(value, ribs.threeExp);
    }
};

const _calcNumberPath = (sequence: number[]): Record<string, number>[] => {
    const response: Record<string, number>[] = [];
    const {scales} = rendererGrid;

    const forEach = (value: number, index: number): void => {
        response.push({
            x: value * scales.ribs,
            y: index * scales.sequenceGrow
        });
    };

    sequence
        .forEach(forEach);

    return response;
};

const _getRandomColor = (): number => {
    return Math.floor(Math.random() * 0xffffff);
};