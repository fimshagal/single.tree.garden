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
};

const rendererGrid: CollatzRendererGridData = {
    ribs: {
        twoPowN: {
            count: 50,
            color: 0xffffff,
            values: []
        },
        threeExp: {
            count: 50,
            color: 0xffffff,
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

    // ...
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

    // app!.stage.addChild(rootContainer!);
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

    const { ribs } = rendererGrid;

    console.log(1);
    rendererPixi.grid = new PIXI.Graphics();
    console.log(2);
    const { grid } = rendererGrid;
    console.log(3);
    rendererPixi.app!.stage.addChild(grid);
    //
    console.log(4);
    grid.lineStyle(1, ribs.twoPowN.color, 1);
    console.log(5);
    for (const value of ribs.twoPowN.values) {
        grid.moveTo(value, 0);
        grid.lineTo(value, 600);
    }
    console.log(6);
    //

    grid.lineStyle(1, ribs.threeExp.color, 1);
    console.log(7);
    for (const value of ribs.threeExp.values) {
        grid.moveTo(value, 0);
        grid.lineTo(value, 600);
    }
};