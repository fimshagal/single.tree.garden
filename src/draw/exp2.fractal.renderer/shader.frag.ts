export const exp2FractalFrag = `
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_c;
uniform float u_zoom;
uniform float u_maxIter;
uniform float u_time;
uniform float u_paletteOffset;

#define LN2 0.6931471805599453

// 2^z for complex z: 2^(x+iy) = 2^x * (cos(y*ln2) + i*sin(y*ln2))
vec2 pow2z(vec2 z) {
    float r = exp(clamp(z.x * LN2, -80.0, 80.0));
    float angle = z.y * LN2;
    return vec2(r * cos(angle), r * sin(angle));
}

// f(z) = 2^z + c
vec2 iterate(vec2 z, vec2 c) {
    return pow2z(z) + c;
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

vec3 palette(float t, float esc) {
    float s = fract(t);

    // pair 1 (dominant): blue <-> black
    float p1 = sin(u_time * 0.5) * 0.5 + 0.5;
    vec3 pair1 = mix(vec3(0.05, 0.1, 0.6), vec3(0.01, 0.01, 0.02), p1);

    // pair 2: pink <-> orange
    float p2 = sin(u_time * 0.4 + 2.0) * 0.5 + 0.5;
    vec3 pair2 = mix(vec3(0.9, 0.2, 0.5), vec3(0.95, 0.5, 0.08), p2);

    // wild colors: smooth random drift
    float seedBase = u_paletteOffset * 100.0;
    vec3 wild1 = smoothRandom(seedBase + 3.0, 0.08);
    vec3 wild2 = smoothRandom(seedBase + 9.0, 0.06);

    // gradient: pair1(45%) -> pair2(25%) -> wild(30%) -> back to pair1
    vec3 col;
    if (s < 0.45)       col = mix(pair1, pair2, s / 0.45);
    else if (s < 0.70)  col = mix(pair2, wild1, (s - 0.45) / 0.25);
    else if (s < 0.88)  col = mix(wild1, wild2, (s - 0.70) / 0.18);
    else                 col = mix(wild2, pair1, (s - 0.88) / 0.12);

    return clamp(col, 0.0, 1.0);
}

vec3 sample(vec2 uv, float aspect) {
    vec2 z = u_center + (uv - 0.5) * vec2(aspect, 1.0) * u_zoom;

    float maxIt = u_maxIter;
    float iter = 0.0;

    for (float i = 0.0; i < 512.0; i += 1.0) {
        if (i >= maxIt) break;
        if (dot(z, z) > 2500.0) break;
        if (z.x > 50.0) break;

        z = iterate(z, u_c);
        iter = i + 1.0;
    }

    if (iter >= maxIt) {
        return vec3(0.005, 0.005, 0.02);
    }
    float smoothIt = iter - log2(max(1.0, log2(dot(z, z))));
    vec3 col = palette(smoothIt * 0.045 + u_paletteOffset, smoothIt);
    return pow(col, vec3(0.9));
}

void main() {
    vec2 uv = vTextureCoord;
    uv.y = 1.0 - uv.y;
    float aspect = u_resolution.x / u_resolution.y;

    vec2 px = vec2(1.0) / u_resolution;

    vec3 col = sample(uv + vec2(-0.25, -0.25) * px, aspect)
             + sample(uv + vec2( 0.25, -0.25) * px, aspect)
             + sample(uv + vec2(-0.25,  0.25) * px, aspect)
             + sample(uv + vec2( 0.25,  0.25) * px, aspect);

    gl_FragColor = vec4(col * 0.25, 1.0);
}
`;
