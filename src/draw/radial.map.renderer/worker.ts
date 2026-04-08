import { buildPower2Graph } from "../../math/collatz.power2.ts";
import type { Power2BuildOptions } from "../../math/collatz.power2.types.ts";
import { computeEnvelope } from "./envelope.ts";

interface WorkerInput {
    graphOpts: Power2BuildOptions;
    ringSpacing: number;
    innerRadius: number;
    predictCausticZones: number;
}

/**
 * Returns positive N = steps to reach 1,
 *         negative -N = trajectory length before entering a cycle (abs = transient),
 *         0 = value is already 1.
 */
function computeStoppingTime(v: number, q: number, w: number, limit: number): number {
    let cur = v;
    const visited = new Set<number>();
    for (let step = 0; step < limit; step++) {
        if (cur === 1) return step;
        if (visited.has(cur)) return -(step || 1);
        visited.add(cur);
        cur = cur % 2 === 0 ? cur / 2 : q * cur + w;
        if (!Number.isSafeInteger(cur) || cur <= 0) return -(step || 1);
    }
    return -limit;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { graphOpts, ringSpacing, innerRadius, predictCausticZones } = e.data;
    const graph = buildPower2Graph(graphOpts);

    const q = graph.multiplier;
    const w = graph.increment;
    const minZone = graph.zones[0]?.n ?? 2;
    const maxZone = graph.zones[graph.zones.length - 1]?.n ?? minZone;

    const envelope = computeEnvelope({
        q, w, minZone, maxZone, ringSpacing, innerRadius, predictCausticZones,
    });

    const stoppingTimes: [number, number][] = [];
    for (const [value] of graph.nodes) {
        stoppingTimes.push([value, computeStoppingTime(value, q, w, 10_000)]);
    }

    self.postMessage({
        zones: graph.zones,
        edges: graph.edges,
        nodes: [...graph.nodes.entries()],
        multiplier: q,
        increment: w,
        envelope,
        stoppingTimes,
    });
};
