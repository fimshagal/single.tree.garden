export const collatzBrotFrag = `
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform float u_epsilon;
uniform float u_time;
uniform float u_paletteOffset;

#define PI 3.14159265358979

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 cosPiZ(vec2 z) {
    float px = PI * z.x;
    float e = exp(clamp(PI * z.y, -18.0, 18.0));
    float ei = 1.0 / e;
    float ch = (e + ei) * 0.5;
    float sh = (e - ei) * 0.5;
    return vec2(cos(px) * ch, -sin(px) * sh);
}

// Continuous Collatz: f(z) = (2 + 7z - (2+5z)·cos(πz)) / 4
vec2 collatzF(vec2 z) {
    vec2 cpz = cosPiZ(z);
    vec2 term = cmul(vec2(2.0 + 5.0 * z.x, 5.0 * z.y), cpz);
    return 0.25 * vec2(2.0 + 7.0 * z.x - term.x, 7.0 * z.y - term.y);
}

// z² + c + ε·(collatz(z) - z)
float escapeTime(vec2 c, float eps) {
    vec2 z = vec2(0.0);
    float maxIt = u_maxIter;
    float it = 0.0;

    for (float i = 0.0; i < 512.0; i += 1.0) {
        if (i >= maxIt) break;
        if (dot(z, z) > 256.0) break;

        vec2 z2 = cmul(z, z);
        vec2 coll = collatzF(z) - z;
        z = z2 + c + eps * coll;
        it = i + 1.0;
    }

    if (it >= maxIt) return -1.0;
    return it - log2(max(1.0, log2(dot(z, z))));
}

vec3 hash3(float p) {
    vec3 q = fract(vec3(p) * vec3(127.1, 311.7, 74.7));
    q += dot(q, q.yzx + 33.33);
    return fract((q.xxy + q.yzz) * q.zyx);
}

vec3 smoothRandom(float seed, float speed) {
    float tt = u_time * speed;
    float k = floor(tt);
    float f = smoothstep(0.0, 1.0, fract(tt));
    return mix(hash3(k + seed), hash3(k + seed + 1.0), f);
}

vec3 palette(float t) {
    float s = fract(t);

    float drift = sin(u_time * 0.2) * 0.08;

    vec3 black    = vec3(0.01, 0.01, 0.02 + drift * 0.3);
    vec3 navy     = vec3(0.04 + drift, 0.08 + drift * 0.5, 0.5 - drift);
    vec3 orange   = vec3(0.95 - drift * 0.5, 0.45 + drift, 0.05 + drift * 0.3);
    vec3 yellow   = vec3(1.0, 0.85 - drift * 0.4, 0.15 + drift);

    float seedBase = u_paletteOffset * 100.0;
    vec3 wild1 = smoothRandom(seedBase + 5.0, 0.04);
    vec3 wild2 = smoothRandom(seedBase + 11.0, 0.03);

    vec3 col;
    if (s < 0.20)       col = mix(black, navy, s / 0.20);
    else if (s < 0.40)  col = mix(navy, orange, (s - 0.20) / 0.20);
    else if (s < 0.55)  col = mix(orange, yellow, (s - 0.40) / 0.15);
    else if (s < 0.70)  col = mix(yellow, wild1, (s - 0.55) / 0.15);
    else if (s < 0.87)  col = mix(wild1, wild2, (s - 0.70) / 0.17);
    else                 col = mix(wild2, black, (s - 0.87) / 0.13);

    return clamp(col, 0.0, 1.0);
}

void main() {
    vec2 uv = vTextureCoord;
    uv.y = 1.0 - uv.y;
    float asp = u_resolution.x / u_resolution.y;

    vec2 c = u_center + (uv - 0.5) * vec2(asp, 1.0) * u_zoom;
    float et = escapeTime(c, u_epsilon);

    if (et < 0.0) {
        gl_FragColor = vec4(0.005, 0.005, 0.02, 1.0);
    } else {
        vec3 col = palette(et * 0.04 + u_paletteOffset);
        gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
    }
}
`;
