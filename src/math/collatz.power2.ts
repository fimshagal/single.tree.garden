import type {
    Power2Node, Power2Edge, Power2ZoneInfo,
    Power2Graph, Power2BuildOptions, Power2NodeType,
} from "./collatz.power2.types.ts";

export const getZone = (v: number): number => Math.floor(Math.log2(v));

export const collatzStep = (n: number, q: number = 3, w: number = 1): number =>
    n % 2 === 0 ? n / 2 : q * n + w;

/**
 * Inverse Collatz: all numbers that reach `m` in exactly one forward step.
 *  - 2m  always  (even rule: 2m → m)
 *  - (m-w)/q when (m-w) is divisible by q and (m-w)/q is odd and positive
 */
export const inversePredecessors = (
    m: number,
    q: number = 3,
    w: number = 1,
): { value: number; edgeType: 'div2' | 'triple' }[] => {
    const preds: { value: number; edgeType: 'div2' | 'triple' }[] = [];

    preds.push({ value: 2 * m, edgeType: 'div2' });

    if ((m - w) % q === 0) {
        const k = (m - w) / q;
        if (k > 0 && k % 2 === 1) {
            preds.push({ value: k, edgeType: 'triple' });
        }
    }

    return preds;
};

export const buildPower2Graph = (options: Power2BuildOptions = {}): Power2Graph => {
    const {
        minZone = 2,
        maxZone = 14,
        maxInverseDepth = 12,
        maxNodes = 20_000,
        forwardFill = false,
        forwardFillMaxZone,
        multiplier: q = 3,
        increment: w = 1,
    } = options;
    const fillMaxZone = forwardFillMaxZone ?? maxZone;

    const nodes = new Map<number, Power2Node>();
    const edges: Power2Edge[] = [];
    const frontier: { value: number; depth: number }[] = [];

    const tryAdd = (value: number, type: Power2NodeType, depth: number): boolean => {
        if (nodes.has(value)) return false;
        const zone = getZone(value);
        if (zone < minZone || zone > maxZone) return false;
        nodes.set(value, { value, zone, type, depth });
        frontier.push({ value, depth });
        return true;
    };

    /* ── seeds ── */
    for (let n = minZone; n <= maxZone; n++) {
        const lo = 2 ** n;
        const hi = 2 ** (n + 1);
        tryAdd(lo, 'power2', 0);

        const center = 3 * 2 ** (n - 1);
        if (center > lo && center < hi) {
            tryAdd(center, 'center', 0);
        }

        if (n >= 2) {
            const subL = 5 * 2 ** (n - 2);
            const subR = 7 * 2 ** (n - 2);
            if (subL > lo && subL < center) tryAdd(subL, 'subcenterL', 0);
            if (subR > center && subR < hi) tryAdd(subR, 'subcenterR', 0);
        }
    }

    /* ── BFS upward through inverse tree ── */
    while (frontier.length > 0 && nodes.size < maxNodes) {
        const { value: m, depth } = frontier.shift()!;
        if (depth >= maxInverseDepth) continue;

        for (const { value: pred, edgeType } of inversePredecessors(m, q, w)) {
            if (!Number.isSafeInteger(pred)) continue;
            const predZone = getZone(pred);
            if (predZone < minZone || predZone > maxZone) continue;

            tryAdd(pred, 'regular', depth + 1);
            edges.push({ from: pred, to: m, type: edgeType });
        }
    }

    /* ── forward fill: trace uncovered odd numbers forward to a known node ── */
    if (forwardFill) {
        for (let n = minZone; n <= fillMaxZone; n++) {
            const lo = 2 ** n;
            const hi = 2 ** (n + 1);
            for (let v = lo + 1; v < hi; v += 2) {
                if (nodes.has(v)) continue;

                const chain: number[] = [v];
                const visited = new Set<number>([v]);
                let cur = collatzStep(v, q, w);
                while (cur > 0 && Number.isSafeInteger(cur) && !nodes.has(cur) && !visited.has(cur)) {
                    chain.push(cur);
                    visited.add(cur);
                    cur = collatzStep(cur, q, w);
                }
                if (!nodes.has(cur) && visited.has(cur)) {
                    const z = getZone(cur);
                    if (z >= minZone && z <= maxZone) {
                        nodes.set(cur, { value: cur, zone: z, type: 'regular', depth: -1 });
                    }
                }
                if (!nodes.has(cur)) continue;

                for (const c of chain) {
                    const z = getZone(c);
                    if (z < minZone || z > maxZone) continue;
                    if (!nodes.has(c)) {
                        nodes.set(c, { value: c, zone: z, type: 'regular', depth: -1 });
                    }
                }
                for (let i = 0; i < chain.length; i++) {
                    const from = chain[i];
                    const to = i + 1 < chain.length ? chain[i + 1] : cur;
                    const zFrom = getZone(from);
                    const zTo = getZone(to);
                    if (zFrom >= minZone && zFrom <= maxZone &&
                        zTo >= minZone && zTo <= maxZone &&
                        nodes.has(from) && nodes.has(to)) {
                        edges.push({
                            from,
                            to,
                            type: from % 2 === 0 ? 'div2' : 'triple',
                        });
                    }
                }
            }
        }
    }

    /* ── zone stats ── */
    const zones: Power2ZoneInfo[] = [];
    for (let n = minZone; n <= maxZone; n++) {
        const lo = 2 ** n;
        const hi = 2 ** (n + 1);
        const totalOdd = 2 ** (n - 1);
        let coveredOdd = 0;
        for (const [val] of nodes) {
            if (val >= lo && val < hi && val % 2 === 1) coveredOdd++;
        }
        zones.push({
            n, lo, hi,
            center: 3 * 2 ** (n - 1),
            subcenterL: n >= 2 ? 5 * 2 ** (n - 2) : null,
            subcenterR: n >= 2 ? 7 * 2 ** (n - 2) : null,
            totalOdd,
            coveredOdd,
            coverage: totalOdd > 0 ? coveredOdd / totalOdd : 1,
        });
    }

    return { zones, nodes, edges, multiplier: q, increment: w };
};
