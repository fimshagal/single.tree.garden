import type {
    CollatzRendererGridData,
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
};

const rendererGrid: CollatzRendererGridData = {
    scales: {
        ribs: 0.125,
        sequenceGrow: 7,
    },
    ribs: {
        twoPowN: {
            count: 40,
            color: 0xffffff,
            alpha: 0.25,
            values: []
        },
        threeExp: {
            count: 40,
            color: 0xffffff,
            alpha: 0.125,
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

    for (const position of path) {

    }
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

    const { grid } = rendererPixi;

    rendererPixi.app!.stage.addChild(grid!);
    rendererPixi.app!.stage.addChild(rendererPixi.numberPath!);

    //

    grid!.lineStyle(1, ribs.twoPowN.color, ribs.twoPowN.alpha);

    for (const value of ribs.twoPowN.values) {
        grid!.moveTo(value * scales.ribs, 0);
        grid!.lineTo(value * scales.ribs, 1_000);
    }

    //

    grid!.lineStyle(1, ribs.threeExp.color, ribs.threeExp.alpha);

    for (const value of ribs.threeExp.values) {
        grid!.moveTo(value * scales.ribs, 0);
        grid!.lineTo(value * scales.ribs, 1_000);
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