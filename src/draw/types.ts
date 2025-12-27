import type {Nullable} from "../misc";
import * as PIXI from "pixi.js";

export interface CollatzRendererInitialConfig {
    parent?: HTMLElement;
}

export interface CollatzRendererUpdateConfig {
    sequence: number[];
    color?: number;
    clearBefore?: boolean;
}

export interface CollatzRendererPixiData {
    app: Nullable<PIXI.Application>;
    grid: Nullable<PIXI.Graphics>;
    numberPath: Nullable<PIXI.Graphics>;
    gridMeasurementMarks: Nullable<PIXI.Container>;
}

export interface CollatzRendererGridRibsConfig {
    count: number;
    alpha: number;
    color: number;
    values: number[];
}

export interface CollatzRendererGridData {
    scales: Record<string, number>;
    ribs: Record<string, CollatzRendererGridRibsConfig>;
}

export interface ICollatzRenderer {
    is: Record<string, boolean>;
    pixi: CollatzRendererPixiData;
    grid: CollatzRendererGridData;
}