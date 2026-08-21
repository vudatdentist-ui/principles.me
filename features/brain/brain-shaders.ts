export const BRAIN_SHARD_VERTEX = `
attribute vec3 aBrain;
attribute vec3 aGraph;
attribute vec3 aColor;
attribute float aScale;
attribute float aSeed;
uniform float uTime;
uniform float uMorph;
uniform vec2 uPointerScreen;
uniform float uPointerActive;
varying vec3 vColor;
varying float vPulse;
varying float vHover;

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  float eased = uMorph * uMorph * (3.0 - 2.0 * uMorph);
  vec3 center = mix(aBrain, aGraph, eased);
  float drift = sin(uTime * (0.24 + aSeed * 0.2) + aSeed * 31.0) * 0.008;
  center += normalize(center + vec3(0.001)) * drift;

  vec4 centerView = modelViewMatrix * vec4(center, 1.0);
  vec4 centerClip = projectionMatrix * centerView;
  vec2 centerScreen = centerClip.xy / centerClip.w;
  vec2 screenDelta = centerScreen - uPointerScreen;
  float distanceToPointer = length(screenDelta);
  float hover = smoothstep(0.28, 0.0, distanceToPointer) * uPointerActive;
  vec2 radial = distanceToPointer > 0.001
    ? screenDelta / distanceToPointer
    : vec2(0.0);
  float ripple = 0.5 + 0.5 * sin(distanceToPointer * 40.0 - uTime * 3.4 + aSeed * 4.0);
  center.xy += radial * hover * (0.008 + 0.009 * ripple);
  center.z += hover * (0.004 + 0.005 * ripple);

  vec3 local = position * aScale;
  float spin = uTime * (0.12 + aSeed * 0.05) + aSeed * 7.0;
  local.xy = rotate2d(spin) * local.xy;
  local.xz = rotate2d(spin * 0.7) * local.xz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(center + local, 1.0);
  vColor = aColor;
  vPulse = 0.88 + 0.18 * sin(uTime * 1.2 + aSeed * 13.0);
  vHover = hover;
}
`;

export const BRAIN_SHARD_FRAGMENT = `
precision highp float;
varying vec3 vColor;
varying float vPulse;
varying float vHover;
uniform float uOpacity;

void main() {
  vec3 color = vColor * (0.82 + vPulse * 0.22 + vHover * 0.18);
  gl_FragColor = vec4(color, uOpacity + vHover * 0.05);
}
`;

export const BRAIN_DUST_VERTEX = `
attribute vec3 aBrain;
attribute vec3 aGraph;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uMorph;
uniform vec2 uPointerScreen;
uniform float uPointerActive;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float eased = uMorph * uMorph * (3.0 - 2.0 * uMorph);
  vec3 point = mix(aBrain, aGraph, eased);
  point += normalize(point + vec3(0.001)) * sin(uTime * 0.75 + aSeed * 17.0) * 0.004;

  vec4 pointView = modelViewMatrix * vec4(point, 1.0);
  vec4 pointClip = projectionMatrix * pointView;
  vec2 pointScreen = pointClip.xy / pointClip.w;
  vec2 delta = pointScreen - uPointerScreen;
  float distanceToPointer = length(delta);
  float hover = smoothstep(0.32, 0.0, distanceToPointer) * uPointerActive;
  vec2 radial = distanceToPointer > 0.001 ? delta / distanceToPointer : vec2(0.0);
  point.xy += radial * hover * 0.006;
  point.z += hover * 0.004;

  vec4 mv = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mv;
  float perspective = clamp(2.7 / max(0.8, -mv.z), 0.45, 2.3);
  gl_PointSize = (1.1 + 2.5 * aSeed * aSeed) * perspective;
  vColor = aColor;
  vAlpha = 0.22 + 0.28 * aSeed + hover * 0.06;
}
`;

export const BRAIN_DUST_FRAGMENT = `
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float alpha = smoothstep(0.5, 0.1, length(uv)) * vAlpha;
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`;

export const BRAIN_LINK_VERTEX = `
attribute vec3 aBrain;
attribute vec3 aGraph;
uniform float uTime;
uniform float uMorph;
varying float vStrength;

void main() {
  float eased = uMorph * uMorph * (3.0 - 2.0 * uMorph);
  vec3 point = mix(aBrain, aGraph, eased);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
  vStrength = 0.045 + 0.02 * (0.5 + 0.5 * sin(uTime * 0.8 + point.x * 2.0));
}
`;

export const BRAIN_LINK_FRAGMENT = `
precision highp float;
varying float vStrength;
uniform float uOpacity;

void main() {
  gl_FragColor = vec4(0.42, 0.76, 0.92, vStrength * uOpacity);
}
`;
