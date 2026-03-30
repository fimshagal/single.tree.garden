export const collatzFractalFrag = `
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_c;
uniform float u_zoom;
uniform float u_maxIter;
uniform float u_colorSpeed;
uniform float u_time;

#define PI 3.141592653589793

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

// f(z) = (1/4)(2 + 7z - (2 + 5z) cos(pi z)) + c
vec2 collatzJulia(vec2 z, vec2 c) {
    vec2 cpi = cosPiZ(z);
    vec2 a = vec2(2.0 + 7.0 * z.x, 7.0 * z.y);
    vec2 b = cmul(vec2(2.0 + 5.0 * z.x, 5.0 * z.y), cpi);
    return 0.25 * (a - b) + c;
}

vec3 palette(float t) {
    float s = fract(t);
    if (s < 0.2)  return mix(vec3(0.02, 0.01, 0.04), vec3(0.45, 0.0, 0.8),  s / 0.2);
    if (s < 0.4)  return mix(vec3(0.45, 0.0, 0.8),   vec3(0.85, 0.12, 0.0), (s - 0.2) / 0.2);
    if (s < 0.6)  return mix(vec3(0.85, 0.12, 0.0),   vec3(1.0, 0.7, 0.0),  (s - 0.4) / 0.2);
    if (s < 0.8)  return mix(vec3(1.0, 0.7, 0.0),     vec3(1.0, 1.0, 0.6),  (s - 0.6) / 0.2);
    return              mix(vec3(1.0, 1.0, 0.6),     vec3(0.02, 0.01, 0.04), (s - 0.8) / 0.2);
}

void main() {
    vec2 uv = vTextureCoord;
    uv.y = 1.0 - uv.y;
    float aspect = u_resolution.x / u_resolution.y;

    vec2 z = u_center + (uv - 0.5) * vec2(aspect, 1.0) * u_zoom;

    float maxIt = u_maxIter;
    float escape2 = 1e4;
    float iter = 0.0;

    for (float i = 0.0; i < 512.0; i += 1.0) {
        if (i >= maxIt) break;
        if (dot(z, z) > escape2) break;
        if (abs(PI * z.y) > 60.0) break;

        z = collatzJulia(z, u_c);
        iter = i + 1.0;
    }

    if (iter >= maxIt) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        float smoothIt = iter - log2(max(1.0, log2(dot(z, z))));
        float t = smoothIt * u_colorSpeed * 0.03 + u_time;
        gl_FragColor = vec4(palette(t), 1.0);
    }
}
`;
