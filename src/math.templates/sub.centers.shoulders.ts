import type {CollatzRendererUpdateConfig} from "../draw";
import {updateRenderer} from "../draw";

export const outputSubCentersShoulders = (baseLimit?: number, updateHandler?: (config: CollatzRendererUpdateConfig) => void): void => {
    updateHandler = updateHandler ?? updateRenderer;
    baseLimit = baseLimit ?? 8192;

    // ...
};