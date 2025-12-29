import {outputSubCentersShoulders} from "./sub.centers.shoulders.ts";
import {outputSubCenters} from "./sub.centers.ts";
import {outputTrunk} from "./trunk.ts";

export const outputSovereignTrunk = (): void => {
    outputSubCentersShoulders();
    outputSubCenters();
    outputTrunk();
};