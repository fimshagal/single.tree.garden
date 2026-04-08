/**
 * Pure-math envelope computation — runs in the worker thread.
 *
 * For each zone transition n → m, the Collatz odd step maps angle α to β = k·α + φ
 * where k = q / 2^(m−n). The envelope of the resulting family of chords is:
 *
 *   γ(α) = (k−1)·α + φ
 *   t(α) = R₁·(R₂·cos γ − R₁) / [R₁·R₂·(k+1)·cos γ − R₁² − k·R₂²]
 *   x(α) = (1−t)·R₁·cos α + t·R₂·cos(kα+φ)
 *   y(α) = (1−t)·R₁·sin α + t·R₂·sin(kα+φ)
 */

export interface EnvelopeSegment {
    srcZone: number;
    dstZone: number;
    k: number;
    phi: number;
    predicted: boolean;
    points: { x: number; y: number; r: number; theta: number }[];
}

export interface EnvelopeParams {
    q: number;
    w: number;
    minZone: number;
    maxZone: number;
    ringSpacing: number;
    innerRadius: number;
    samples?: number;
    /** Extra zones beyond maxZone to predict (same numerical method, no graph needed). */
    predictCausticZones?: number;
}

export function computeEnvelope(params: EnvelopeParams): EnvelopeSegment[] {
    const {
        q, w, minZone, maxZone,
        ringSpacing, innerRadius,
        samples = 800,
        predictCausticZones = 0,
    } = params;

    const totalMax = maxZone + predictCausticZones;
    const ringR = (zone: number): number => innerRadius + (zone - minZone) * ringSpacing;
    const result: EnvelopeSegment[] = [];

    for (let n = minZone; n <= totalMax; n++) {
        const R1 = ringR(n);
        const predicted = n > maxZone;

        const linesByTarget = new Map<number, { alpha: number; ax: number; ay: number; bx: number; by: number }[]>();

        for (let i = 0; i <= samples; i++) {
            const s = i / samples;
            const v = 2 ** n * (1 + s);
            const tv = q * v + w;
            if (tv <= 0 || !Number.isFinite(tv)) continue;

            const m = Math.floor(Math.log2(tv));
            if (m < minZone || m > totalMax) continue;

            const R2 = ringR(m);
            const alpha = -Math.PI / 2 + 2 * Math.PI * s;
            const s2 = (tv - 2 ** m) / 2 ** m;
            const beta = -Math.PI / 2 + 2 * Math.PI * s2;

            if (!linesByTarget.has(m)) linesByTarget.set(m, []);
            linesByTarget.get(m)!.push({
                alpha,
                ax: R1 * Math.cos(alpha), ay: R1 * Math.sin(alpha),
                bx: R2 * Math.cos(beta),  by: R2 * Math.sin(beta),
            });
        }

        for (const [m, lines] of linesByTarget) {
            if (lines.length < 2) continue;

            const j = m - n;
            const k = q / 2 ** j;
            const aMid = lines[Math.floor(lines.length / 2)].alpha;
            const sMid = (aMid + Math.PI / 2) / (2 * Math.PI);
            const vMid = 2 ** n * (1 + sMid);
            const tvMid = q * vMid + w;
            const betaMid = -Math.PI / 2 + 2 * Math.PI * ((tvMid - 2 ** m) / 2 ** m);
            const phi = betaMid - k * aMid;

            const points: EnvelopeSegment['points'] = [];

            for (let i = 0; i < lines.length - 1; i++) {
                const L1 = lines[i], L2 = lines[i + 1];

                const d1x = L1.bx - L1.ax, d1y = L1.by - L1.ay;
                const d2x = L2.bx - L2.ax, d2y = L2.by - L2.ay;

                const det = d1x * d2y - d1y * d2x;
                if (Math.abs(det) < 1e-8) continue;

                const dx = L2.ax - L1.ax, dy = L2.ay - L1.ay;
                const t = (dx * d2y - dy * d2x) / det;

                const px = L1.ax + t * d1x;
                const py = L1.ay + t * d1y;

                points.push({
                    x: px, y: py,
                    r: Math.sqrt(px * px + py * py),
                    theta: Math.atan2(py, px),
                });
            }

            if (points.length > 0) {
                result.push({ srcZone: n, dstZone: m, k, phi, predicted, points });
            }
        }
    }

    return result;
}
