import { buildPower2Graph } from "../../math/collatz.power2.ts";
import type { Power2BuildOptions } from "../../math/collatz.power2.types.ts";
import { computeEnvelope } from "./envelope.ts";

interface WorkerInput {
    graphOpts: Power2BuildOptions;
    ringSpacing: number;
    innerRadius: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { graphOpts, ringSpacing, innerRadius } = e.data;
    const graph = buildPower2Graph(graphOpts);

    const minZone = graph.zones[0]?.n ?? 2;
    const maxZone = graph.zones[graph.zones.length - 1]?.n ?? minZone;

    const envelope = computeEnvelope({
        q: graph.multiplier,
        w: graph.increment,
        minZone,
        maxZone,
        ringSpacing,
        innerRadius,
    });

    self.postMessage({
        zones: graph.zones,
        edges: graph.edges,
        nodes: [...graph.nodes.entries()],
        multiplier: graph.multiplier,
        increment: graph.increment,
        envelope,
    });
};
