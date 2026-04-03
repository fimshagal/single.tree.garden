import { buildPower2Graph } from "../../math/collatz.power2.ts";
import type { Power2BuildOptions } from "../../math/collatz.power2.types.ts";

self.onmessage = (e: MessageEvent<Power2BuildOptions>) => {
    const graph = buildPower2Graph(e.data);

    self.postMessage({
        zones: graph.zones,
        edges: graph.edges,
        nodes: [...graph.nodes.entries()],
        multiplier: graph.multiplier,
        increment: graph.increment,
    });
};
