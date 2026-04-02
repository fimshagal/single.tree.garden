export const collatz3dFrag = `
precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraTarget;
uniform vec2 u_c;
uniform float u_zScale;
uniform float u_maxIter;
uniform float u_time;

#define PI 3.141592653589793
#define VOL_STEPS 90
#define MAX_DIST 12.0
#define ITER 40

float _cosh(float x) {
    float ex = exp(clamp(x, -80.0, 80.0));
    return (ex + 1.0 / ex) * 0.5;
}

float _sinh(float x) {
    float ex = exp(clamp(x, -80.0, 80.0));
    return (ex - 1.0 / ex) * 0.5;
}

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 cosPiZ(vec2 z) {
    float px = PI * z.x;
    float py = PI * z.y;
    return vec2(cos(px) * _cosh(py), -sin(px) * _sinh(py));
}

vec2 collatzJulia(vec2 z, vec2 c) {
    vec2 cpi = cosPiZ(z);
    vec2 a = vec2(2.0 + 7.0 * z.x, 7.0 * z.y);
    vec2 b = cmul(vec2(2.0 + 5.0 * z.x, 5.0 * z.y), cpi);
    return 0.25 * (a - b) + c;
}

float escapeSmooth(vec3 p) {
    vec2 z = p.xy;
    vec2 c = u_c + vec2(0.0, p.z * u_zScale);

    for (int i = 0; i < ITER; i++) {
        float r2 = dot(z, z);
        if (r2 > 100.0) {
            return float(i) - log2(max(1.0, log2(r2)));
        }
        if (abs(z.y) > 10.0) return float(i);
        z = collatzJulia(z, c);
    }
    return float(ITER);
}

vec3 coldPalette(float t) {
    float s = fract(t);
    if (s < 0.2)  return mix(vec3(0.01, 0.02, 0.08), vec3(0.05, 0.15, 0.5),  s / 0.2);
    if (s < 0.4)  return mix(vec3(0.05, 0.15, 0.5),  vec3(0.1, 0.4, 0.8),    (s - 0.2) / 0.2);
    if (s < 0.6)  return mix(vec3(0.1, 0.4, 0.8),    vec3(0.3, 0.7, 0.9),    (s - 0.4) / 0.2);
    if (s < 0.8)  return mix(vec3(0.3, 0.7, 0.9),    vec3(0.7, 0.9, 1.0),    (s - 0.6) / 0.2);
    return              mix(vec3(0.7, 0.9, 1.0),    vec3(0.01, 0.02, 0.08),  (s - 0.8) / 0.2);
}

vec3 warmPalette(float t) {
    float s = fract(t);
    if (s < 0.25) return mix(vec3(0.4, 0.0, 0.6),   vec3(0.8, 0.1, 0.5),    s / 0.25);
    if (s < 0.5)  return mix(vec3(0.8, 0.1, 0.5),   vec3(1.0, 0.5, 0.15),   (s - 0.25) / 0.25);
    if (s < 0.75) return mix(vec3(1.0, 0.5, 0.15),  vec3(1.0, 0.9, 0.3),    (s - 0.5) / 0.25);
    return              mix(vec3(1.0, 0.9, 0.3),   vec3(0.4, 0.0, 0.6),    (s - 0.75) / 0.25);
}

vec3 palette(float t, float esc) {
    vec3 cold = coldPalette(t);
    float warmZone = smoothstep(12.0, 20.0, esc) * (1.0 - smoothstep(28.0, 36.0, esc));
    float pulse = 0.5 + 0.5 * sin(u_time * 3.0 + esc * 0.4);
    vec3 warm = warmPalette(t + pulse * 0.15);
    return mix(cold, warm, warmZone * 0.85);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    vec3 ro = u_cameraPos;
    vec3 fwd = normalize(u_cameraTarget - ro);
    vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, fwd);
    vec3 rd = normalize(fwd + right * uv.x * 0.8 + up * uv.y * 0.8);

    float stepSize = MAX_DIST / float(VOL_STEPS);
    vec3 accColor = vec3(0.0);
    float accAlpha = 0.0;

    for (int i = 0; i < VOL_STEPS; i++) {
        if (accAlpha > 0.95) break;

        float t = float(i) * stepSize;
        vec3 p = ro + rd * t;

        float esc = escapeSmooth(p);
        float maxIt = float(ITER);

        float boundary = 1.0 - abs(esc - maxIt * 0.4) / (maxIt * 0.4);
        boundary = clamp(boundary, 0.0, 1.0);
        boundary = pow(boundary, 2.5);

        float trapped = smoothstep(maxIt * 0.8, maxIt, esc);
        float density = boundary * 0.12 + trapped * 0.04;

        if (density > 0.001) {
            vec3 sampleColor = palette(esc * 0.06, esc);
            sampleColor *= 1.0 + boundary * 1.5;

            float alpha = 1.0 - exp(-density * stepSize * 15.0);
            accColor += sampleColor * alpha * (1.0 - accAlpha);
            accAlpha += alpha * (1.0 - accAlpha);
        }
    }

    vec3 bg = vec3(0.01, 0.005, 0.02);
    bg += vec3(0.015, 0.008, 0.03) * (uv.y * 0.5 + 0.5);

    vec3 col = accColor + bg * (1.0 - accAlpha);

    col = 1.0 - exp(-col * 1.8);
    col = pow(col, vec3(0.85));

    gl_FragColor = vec4(col, 1.0);
}
`;
