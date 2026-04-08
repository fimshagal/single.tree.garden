import type { Power2BuildOptions } from "../../math/collatz.power2.types.ts";

export interface RadialMapRendererOptions {
    graph?: Power2BuildOptions;

    backgroundColor?: string;
    ringSpacing?: number;
    innerRadius?: number;
    nodeBaseSize?: number;
    edgeOpacity?: number;
    edgeBow?: number;
    showLabels?: boolean;
    showCoverage?: boolean;
    showDiv2Edges?: boolean;
    /** Extra zones beyond maxZone for envelope prediction (default 0). */
    predictCausticZones?: number;
}
