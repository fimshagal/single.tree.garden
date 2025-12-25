import type {Nullable} from "../misc";
import * as PIXI from "pixi.js";

export interface CollatzRendererInitialConfig {
    parent?: HTMLElement;
}

export interface CollatzRendererUpdateConfig {
    sequence: number[];
}

export interface CollatzRendererPixiData {
    app: Nullable<PIXI.Application>;
    grid: Nullable<PIXI.Graphics>;
}

export interface CollatzRendererGridRibsConfig {
    count: number;
    color: number;
    values: number[];
}

export interface CollatzRendererGridData {
    ribs: Record<string, CollatzRendererGridRibsConfig>;
}

export interface ICollatzRenderer {
    is: Record<string, boolean>;
    pixi: CollatzRendererPixiData;
    grid: CollatzRendererGridData;
}