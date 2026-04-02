export type Power2NodeType = 'power2' | 'center' | 'subcenterL' | 'subcenterR' | 'regular';

export interface Power2Node {
    value: number;
    zone: number;
    type: Power2NodeType;
    depth: number;
}

export interface Power2Edge {
    from: number;
    to: number;
    type: 'div2' | 'triple';
}

export interface Power2ZoneInfo {
    n: number;
    lo: number;
    hi: number;
    center: number;
    subcenterL: number | null;
    subcenterR: number | null;
    totalOdd: number;
    coveredOdd: number;
    coverage: number;
}

export interface Power2Graph {
    zones: Power2ZoneInfo[];
    nodes: Map<number, Power2Node>;
    edges: Power2Edge[];
}

export interface Power2BuildOptions {
    minZone?: number;
    maxZone?: number;
    maxInverseDepth?: number;
    maxNodes?: number;
    /**
     * After the inverse BFS, trace every uncovered odd number forward
     * until it hits an already-known node, then splice the whole chain
     * into the graph.  Guarantees 100 % coverage within the zone range.
     */
    forwardFill?: boolean;
    /** Upper zone limit for forward-fill scanning (defaults to maxZone). */
    forwardFillMaxZone?: number;
}
