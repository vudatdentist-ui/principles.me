// biome-ignore-all lint/suspicious/noUnknownAttribute: React Three Fiber intrinsic props are not DOM attributes.
// biome-ignore-all lint/a11y/noStaticElementInteractions: Three.js meshes are the interactive graph nodes.
// biome-ignore-all lint/a11y/useAriaPropsSupportedByRole: The canvas wrapper labels the visual scene.
// biome-ignore-all lint/suspicious/noArrayIndexKey: Particle positions are deterministic and never reorder.

"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
// biome-ignore lint/performance/noNamespaceImport: Three.js is used as a cohesive renderer namespace.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { BrainMode } from "@/lib/principles-graph";

type BrainSceneProps = {
  mode: BrainMode;
};

type BrainPointer = {
  active: boolean;
  x: number;
  y: number;
};

type TouchSample = {
  life: number;
  u: number;
  v: number;
};

type BrainTouchField = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  samples: TouchSample[];
  texture: THREE.CanvasTexture;
};

type WisdomBrainState = {
  dustMaterial: THREE.ShaderMaterial;
  group: THREE.Group;
  lineMaterial: THREE.ShaderMaterial;
  linkLines: THREE.LineSegments;
  morph: number;
  pointerStrength: number;
  touchField: BrainTouchField;
  shardMaterial: THREE.ShaderMaterial;
  from: number;
  to: number;
};

const COUNT = 14_000;
const SHARD_COUNT = 6200;
const LINK_NODE_COUNT = 96;
const LINK_COUNT = 72;

const BASE_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil;
attribute vec3 aColor; attribute vec3 aNormal; attribute float aScale; attribute float aSeed;
uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uMorph; uniform float uDepth; uniform vec3 uPointer; uniform vec2 uPointerScreen; uniform float uPointerActive; uniform sampler2D uTouch;
varying vec3 vColor; varying float vPulse; varying float vEdge; varying float vHover;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
mat2 r2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
 vec3 A=pick(uFrom),B=pick(uTo); float e=uMorph*uMorph*(3.0-2.0*uMorph); vec3 center=mix(A,B,e);
 float floatWave=.5+.5*sin(uTime*(.32+aSeed*.38)+aSeed*26.0); float detachCycle=.5+.5*sin(uTime*.42+aSeed*43.0); float floatMask=smoothstep(.78,.99,aSeed)*smoothstep(.68,.96,detachCycle);
 vec3 floatDirection=normalize(vec3(sin(aSeed*31.0+uTime*.17),cos(aSeed*23.0-uTime*.13),sin(aSeed*19.0+uTime*.11)));
 center+=floatDirection*floatMask*(.008+.026*floatWave);
 center.z += uDepth;
 vec4 centerView=modelViewMatrix*vec4(center,1.0); vec4 originView=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); float depthDelta=centerView.z-originView.z; float depthFrontness=smoothstep(-.02,.26,depthDelta); float normalFrontness=smoothstep(-.05,.32,normalize(normalMatrix*aNormal).z); float frontness=depthFrontness*(.3+.7*normalFrontness); vec4 centerClip=projectionMatrix*centerView; vec2 particleScreen=centerClip.xy/centerClip.w; vec2 screenDelta=particleScreen-uPointerScreen; float screenDistance=length(screenDelta); float cursorInfluence=smoothstep(.26,0.0,screenDistance)*uPointerActive*frontness; vec2 screenRadial=screenDistance>.001?screenDelta/screenDistance:vec2(0.0); float ripple=.5+.5*sin(screenDistance*42.0-uTime*3.6+aSeed*3.0);
 float touch=texture2D(uTouch,clamp(particleScreen*.5+.5,.02,.98)).r*frontness; float pointerInfluence=max(cursorInfluence,touch*.62);
 center.xy+=screenRadial*cursorInfluence*(.008+.010*ripple); center.z+=cursorInfluence*(.004+.006*ripple)+touch*.008;
 float clusterPhase=dot(center,vec3(1.75,1.35,1.1))+aSeed*.42; float clusterSpin=uTime*(.14+.025*sin(dot(center,vec3(2.0,1.5,.9))))+clusterPhase; float pulse=.92+.18*sin(uTime*1.2+clusterPhase*2.4); vec3 local=position*aScale*pulse;
 local.xy=r2(clusterSpin)*local.xy; local.xz=r2(clusterSpin*.72+aSeed*.9)*local.xz; local.yz=r2(clusterSpin*.48+aSeed*1.6)*local.yz;
 vec4 mv=modelViewMatrix*vec4(center+local,1.0); gl_Position=projectionMatrix*mv;
 vColor=aColor; vPulse=.88+.22*sin(uTime*1.35+aSeed*11.0); vEdge=clamp(length(position)*1.25,0.0,1.0); vHover=pointerInfluence;
}`;

const BASE_FRAGMENT =
  "precision highp float; varying vec3 vColor; varying float vPulse; varying float vEdge; varying float vHover; uniform float uOpacity; void main(){ vec3 c=vColor*(.78+vPulse*.28+vHover*.22); gl_FragColor=vec4(c,uOpacity+.03*vHover); }";

const DUST_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil;
attribute vec3 aColor; attribute vec3 aNormal; attribute float aSeed;
uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uMorph; uniform float uDepth; uniform vec3 uPointer; uniform vec2 uPointerScreen; uniform float uPointerActive; uniform sampler2D uTouch;
varying vec3 vColor; varying float vAlpha; varying float vHover;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
void main(){
 float e=uMorph*uMorph*(3.0-2.0*uMorph);
 vec3 p=mix(pick(uFrom),pick(uTo),e);
 float floatWave=.5+.5*sin(uTime*(.28+aSeed*.34)+aSeed*21.0); float detachCycle=.5+.5*sin(uTime*.36+aSeed*37.0); float floatMask=smoothstep(.82,.995,aSeed)*smoothstep(.72,.98,detachCycle);
 vec3 floatDirection=normalize(vec3(cos(aSeed*27.0+uTime*.15),sin(aSeed*19.0-uTime*.12),cos(aSeed*17.0+uTime*.09)));
 p+=floatDirection*floatMask*(.006+.018*floatWave);
 p.z += uDepth;
 vec4 particleView=modelViewMatrix*vec4(p,1.0); vec4 originView=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); float depthFrontness=smoothstep(-.02,.26,particleView.z-originView.z); float normalFrontness=smoothstep(-.05,.32,normalize(normalMatrix*aNormal).z); float frontness=depthFrontness*(.3+.7*normalFrontness); vec4 particleClip=projectionMatrix*particleView; vec2 particleScreen=particleClip.xy/particleClip.w; vec2 screenDelta=particleScreen-uPointerScreen; float screenDistance=length(screenDelta); float cursorInfluence=smoothstep(.30,0.0,screenDistance)*uPointerActive*frontness; vec2 screenRadial=screenDistance>.001?screenDelta/screenDistance:vec2(0.0); float ripple=.5+.5*sin(screenDistance*38.0-uTime*3.2+aSeed*4.0);
 float touch=texture2D(uTouch,clamp(particleScreen*.5+.5,.02,.98)).r*frontness; float pointerInfluence=max(cursorInfluence,touch*.5);
 p.xy+=screenRadial*cursorInfluence*(.006+.008*ripple); p.z+=cursorInfluence*(.003+.005*ripple)+touch*.005;
 float breathe=.004*sin(uTime*.8+aSeed*17.0);
 p += normalize(p+vec3(.0001))*breathe;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 float perspective=clamp(2.7/max(.8,-mv.z),.45,2.4);
 gl_PointSize=(1.15+2.65*aSeed*aSeed)*perspective;
 vColor=aColor; vAlpha=.23+.27*aSeed; vHover=pointerInfluence;
}`;

const DUST_FRAGMENT =
  "precision highp float; varying vec3 vColor; varying float vAlpha; varying float vHover; void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); float a=smoothstep(.50,.10,d)*vAlpha*(1.0+.16*vHover); if(a<.015) discard; gl_FragColor=vec4(vColor*(.86+.16*vHover),a); }";

const LINK_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil;
uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uMorph; uniform float uDepth; uniform vec3 uPointer; uniform vec2 uPointerScreen; uniform float uPointerActive; uniform sampler2D uTouch;
varying float vStrength;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
void main(){
 float e=uMorph*uMorph*(3.0-2.0*uMorph);
 vec3 p=mix(pick(uFrom),pick(uTo),e);
 float pulse=.5+.5*sin(uTime*.8+p.x*2.0+p.y*1.6);
 vec4 linkView=modelViewMatrix*vec4(p,1.0); vec4 originView=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); float frontness=smoothstep(-.02,.26,linkView.z-originView.z); vec4 linkClip=projectionMatrix*linkView; vec2 linkScreen=linkClip.xy/linkClip.w; vec2 screenDelta=linkScreen-uPointerScreen; float cursorInfluence=smoothstep(.34,0.0,length(screenDelta))*uPointerActive*frontness;
 float touch=texture2D(uTouch,clamp(linkScreen*.5+.5,.02,.98)).r*frontness;
 float influence=max(cursorInfluence,touch*.6);
 p += normalize(vec3(p.xy-uPointer.xy,.18))*cursorInfluence*.006;
 p.z += uDepth;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 vStrength=.025+.018*pulse+.05*influence;
}`;

const LINK_FRAGMENT =
  "precision highp float; varying float vStrength; uniform float uOpacity; void main(){ gl_FragColor=vec4(.52,.38,1.0,vStrength*uOpacity); }";

function seeded(index: number, salt = 12.9898) {
  return Math.abs(Math.sin(index * salt) * 43_758.5453) % 1;
}

function gaussian(index: number, salt: number) {
  const u = Math.max(0.0001, seeded(index, salt));
  const v = seeded(index, salt + 3.7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283_185 * v);
}

function colorFor(point: THREE.Vector3, index: number) {
  const palette = [
    "#ffd21f",
    "#f5e9ff",
    "#9c3fff",
    "#20e6d1",
    "#ff3f92",
    "#2b8fff",
    "#ff721a",
  ];
  const cellX = Math.floor(point.x / 0.48);
  const cellY = Math.floor(point.y / 0.48);
  const cellZ = Math.floor(point.z / 0.58);
  const cellSeed = cellX * 17.31 + cellY * 31.73 + cellZ * 47.11;
  const color = new THREE.Color(
    palette[Math.floor(seeded(cellSeed, 17) * palette.length)]
  );
  const hsl = { h: 0, l: 0, s: 0 };
  color.getHSL(hsl);
  color.setHSL(
    (hsl.h + (point.x + point.y) * 0.008 + seeded(cellSeed, 29) * 0.035 + 1) %
      1,
    Math.min(1, hsl.s * (1.02 + seeded(cellSeed, 31) * 0.1)),
    Math.min(0.92, hsl.l + 0.07 + seeded(index, 67) * 0.08)
  );
  return color.lerp(
    new THREE.Color("#ffffff"),
    0.012 + seeded(index, 71) * 0.045
  );
}

function createTouchField(): BrainTouchField {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The Brain touch field could not be created.");
  }
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return { canvas, context, samples: [], texture };
}

function uniformSet(touchTexture: THREE.Texture) {
  return {
    uDepth: { value: 0 },
    uFrom: { value: 0 },
    uMorph: { value: 1 },
    uPointer: { value: new THREE.Vector3() },
    uPointerActive: { value: 0 },
    uPointerScreen: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uTo: { value: 0 },
    uTouch: { value: touchTexture },
  };
}

function createWisdomBrain(gltf: { scene: THREE.Group }): WisdomBrainState {
  const group = new THREE.Group();
  const touchField = createTouchField();
  const meshes: THREE.Mesh[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object);
    }
  });
  if (!meshes.length) {
    throw new Error("The Principles brain asset contains no mesh.");
  }

  const samplers = meshes.map((mesh) => new MeshSurfaceSampler(mesh).build());
  const brain = new Float32Array(COUNT * 3);
  const graph = new Float32Array(COUNT * 3);
  const thinker = new Float32Array(COUNT * 3);
  const council = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const normals = new Float32Array(COUNT * 3);
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  const sample = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const centers = [
    [-1.25, 0.58, 0],
    [-0.2, 1.02, 0.1],
    [1.02, 0.67, -0.1],
    [1.28, -0.35, 0.05],
    [0.1, -1.0, 0],
    [-1.0, -0.62, -0.08],
  ];
  const thinkerCenters = [
    [-1.45, 0.45, 0.05],
    [-0.88, -0.35, 0.18],
    [-0.15, 0.65, -0.1],
    [0.48, -0.52, 0.22],
    [1.08, 0.46, -0.15],
    [1.48, -0.32, 0.12],
  ];

  for (let index = 0; index < COUNT; index += 1) {
    const cluster = index % 6;
    const mesh = meshes[index % meshes.length];
    samplers[index % samplers.length].sample(sample, normal);
    sample.applyMatrix4(mesh.matrixWorld).multiplyScalar(1.3);
    normal
      .applyMatrix3(normalMatrix.getNormalMatrix(mesh.matrixWorld))
      .normalize();
    brain.set([sample.x, sample.y, sample.z], index * 3);
    normals.set([normal.x, normal.y, normal.z], index * 3);
    colors.set(colorFor(sample, index).toArray(), index * 3);
    seeds[index] = seeded(index, 17);
    scales[index] = 0.007 + 0.0185 * seeded(index, 31) ** 1.6;

    const center = centers[cluster];
    const spread = 0.29 + 0.18 * seeded(index, 21);
    graph.set(
      [
        center[0] + gaussian(index, 13) * spread,
        center[1] + gaussian(index, 19) * spread * 0.75,
        center[2] + gaussian(index, 23) * spread,
      ],
      index * 3
    );

    const constellation = thinkerCenters[cluster];
    const angle = seeded(index, 33) * Math.PI * 2;
    const radius = 0.12 + 0.42 * seeded(index, 41) ** 0.65;
    thinker.set(
      [
        constellation[0] + Math.cos(angle) * radius,
        constellation[1] + Math.sin(angle) * radius * 0.62,
        (seeded(index, 44) - 0.5) * 0.46,
      ],
      index * 3
    );

    const lane = cluster - 2.5;
    const rank = Math.floor(index / 6);
    const councilRadius = 0.12 + 0.42 * seeded(index, 51) ** 0.7;
    const councilAngle = seeded(index, 52) * Math.PI * 2;
    council.set(
      [
        lane * 0.52 + Math.cos(councilAngle) * councilRadius * 0.44,
        (seeded(index, 53) - 0.5) * 1.65,
        Math.sin(councilAngle) * councilRadius + 0.12 * Math.sin(rank * 0.12),
      ],
      index * 3
    );
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)
  );
  dustGeometry.setAttribute("aBrain", new THREE.BufferAttribute(brain, 3));
  dustGeometry.setAttribute("aGraph", new THREE.BufferAttribute(graph, 3));
  dustGeometry.setAttribute("aThinker", new THREE.BufferAttribute(thinker, 3));
  dustGeometry.setAttribute("aCouncil", new THREE.BufferAttribute(council, 3));
  dustGeometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  dustGeometry.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
  dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const dustUniforms = uniformSet(touchField.texture);
  const dustMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: DUST_FRAGMENT,
    transparent: true,
    uniforms: dustUniforms,
    vertexShader: DUST_VERTEX,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  group.add(dust);

  const shardGeometry = new THREE.InstancedBufferGeometry();
  const tetrahedron = new THREE.TetrahedronGeometry(1, 0);
  const shardEdges = new THREE.EdgesGeometry(tetrahedron);
  shardGeometry.setAttribute("position", shardEdges.getAttribute("position"));
  shardGeometry.setAttribute(
    "aBrain",
    new THREE.InstancedBufferAttribute(brain, 3)
  );
  shardGeometry.setAttribute(
    "aGraph",
    new THREE.InstancedBufferAttribute(graph, 3)
  );
  shardGeometry.setAttribute(
    "aThinker",
    new THREE.InstancedBufferAttribute(thinker, 3)
  );
  shardGeometry.setAttribute(
    "aCouncil",
    new THREE.InstancedBufferAttribute(council, 3)
  );
  shardGeometry.setAttribute(
    "aColor",
    new THREE.InstancedBufferAttribute(colors, 3)
  );
  shardGeometry.setAttribute(
    "aNormal",
    new THREE.InstancedBufferAttribute(normals, 3)
  );
  shardGeometry.setAttribute(
    "aScale",
    new THREE.InstancedBufferAttribute(scales, 1)
  );
  shardGeometry.setAttribute(
    "aSeed",
    new THREE.InstancedBufferAttribute(seeds, 1)
  );
  shardGeometry.instanceCount = SHARD_COUNT;
  const shardUniforms = {
    ...uniformSet(touchField.texture),
    uOpacity: { value: 0.68 },
  };
  const shardMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: BASE_FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: shardUniforms,
    vertexShader: BASE_VERTEX,
  });
  const shards = new THREE.LineSegments(shardGeometry, shardMaterial);
  shards.frustumCulled = false;
  group.add(shards);

  const linkNodes = new Float32Array(LINK_NODE_COUNT * 3);
  for (let index = 0; index < LINK_NODE_COUNT; index += 1) {
    const source =
      (index * Math.floor(COUNT / LINK_NODE_COUNT) +
        Math.floor(seeded(index, 91) * 37)) %
      COUNT;
    linkNodes.set(brain.slice(source * 3, source * 3 + 3), index * 3);
  }
  const linkBrain = new Float32Array(LINK_COUNT * 2 * 3);
  const linkPairs = new Set<string>();
  let linkIndex = 0;
  for (
    let from = 0;
    from < LINK_NODE_COUNT && linkIndex < LINK_COUNT;
    from += 1
  ) {
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let to = 0; to < LINK_NODE_COUNT; to += 1) {
      if (to === from) {
        continue;
      }
      const dx = linkNodes[from * 3] - linkNodes[to * 3];
      const dy = linkNodes[from * 3 + 1] - linkNodes[to * 3 + 1];
      const dz = linkNodes[from * 3 + 2] - linkNodes[to * 3 + 2];
      const distance = dx * dx + dy * dy + dz * dz;
      const key = `${Math.min(from, to)}:${Math.max(from, to)}`;
      if (distance < nearestDistance && !linkPairs.has(key)) {
        nearest = to;
        nearestDistance = distance;
      }
    }
    if (nearest < 0) {
      continue;
    }
    linkPairs.add(`${Math.min(from, nearest)}:${Math.max(from, nearest)}`);
    const to = nearest;
    linkBrain.set(linkNodes.slice(from * 3, from * 3 + 3), linkIndex * 6);
    linkBrain.set(linkNodes.slice(to * 3, to * 3 + 3), linkIndex * 6 + 3);
    linkIndex += 1;
  }
  const lineGraph = linkBrain.slice();
  const lineThinker = linkBrain.slice();
  const lineCouncil = linkBrain.slice();
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(linkBrain, 3)
  );
  lineGeometry.setAttribute("aBrain", new THREE.BufferAttribute(linkBrain, 3));
  lineGeometry.setAttribute("aGraph", new THREE.BufferAttribute(lineGraph, 3));
  lineGeometry.setAttribute(
    "aThinker",
    new THREE.BufferAttribute(lineThinker, 3)
  );
  lineGeometry.setAttribute(
    "aCouncil",
    new THREE.BufferAttribute(lineCouncil, 3)
  );
  const lineMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: LINK_FRAGMENT,
    transparent: true,
    uniforms: {
      ...uniformSet(touchField.texture),
      uDepth: { value: 0.04 },
      uOpacity: { value: 0.42 },
    },
    vertexShader: LINK_VERTEX,
  });
  const linkLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  linkLines.frustumCulled = false;
  linkLines.visible = true;
  group.add(linkLines);

  return {
    dustMaterial,
    from: 0,
    group,
    lineMaterial,
    linkLines,
    morph: 1,
    pointerStrength: 0,
    shardMaterial,
    to: 0,
    touchField,
  };
}

function modeIndex(mode: BrainMode) {
  return mode === "brain"
    ? 0
    : mode === "graph"
      ? 1
      : mode === "constellation"
        ? 2
        : 3;
}

function updateTouchField(
  field: BrainTouchField,
  pointer: BrainPointer,
  delta: number
) {
  const { canvas, context, samples } = field;
  const fade = Math.min(0.28, delta * 3.4);
  context.fillStyle = `rgba(0, 0, 0, ${fade})`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (pointer.active) {
    const u = THREE.MathUtils.clamp(pointer.x * 0.5 + 0.5, 0.02, 0.98);
    const v = THREE.MathUtils.clamp(pointer.y * 0.5 + 0.5, 0.02, 0.98);
    const [previous] = samples;
    const distance = previous
      ? Math.hypot(u - previous.u, v - previous.v)
      : Number.POSITIVE_INFINITY;
    if (distance > 0.004) {
      samples.unshift({ life: 1, u, v });
      if (samples.length > 48) {
        samples.pop();
      }
    }
  }

  context.globalCompositeOperation = "lighter";
  for (const sample of samples) {
    sample.life = Math.max(0, sample.life - delta * 1.8);
    const x = sample.u * canvas.width;
    const y = (1 - sample.v) * canvas.height;
    const radius = 7 + (1 - sample.life) * 12;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${sample.life * 0.72})`);
    gradient.addColorStop(0.35, `rgba(255, 255, 255, ${sample.life * 0.28})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.globalCompositeOperation = "source-over";
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (samples[index].life <= 0.015) {
      samples.splice(index, 1);
    }
  }
  field.texture.needsUpdate = true;
}

function WisdomBrain({
  mode,
  pointerRef,
}: {
  mode: BrainMode;
  pointerRef: { current: BrainPointer };
}) {
  const gltf = useLoader(GLTFLoader, "/brain.glb") as unknown as {
    scene: THREE.Group;
  };
  const state = useMemo(() => createWisdomBrain(gltf), [gltf]);
  const pointerScreenTarget = useMemo(() => new THREE.Vector2(), []);
  const pointerScreenSmooth = useMemo(() => new THREE.Vector2(), []);
  const target = modeIndex(mode);
  const layout =
    mode === "brain"
      ? {
          position: [0.78, -0.03, 0.02] as [number, number, number],
          scale: 1.14,
        }
      : mode === "graph"
        ? { position: [0, 0, 0] as [number, number, number], scale: 0.98 }
        : mode === "constellation"
          ? {
              position: [0.75, 0.02, 0.03] as [number, number, number],
              scale: 0.72,
            }
          : {
              position: [0.68, -0.02, 0.04] as [number, number, number],
              scale: 0.78,
            };

  useEffect(() => () => state.touchField.texture.dispose(), [state]);

  useEffect(() => {
    if (state.to === target) {
      return;
    }
    state.from = state.to;
    state.to = target;
    state.morph = 0;
    state.shardMaterial.uniforms.uFrom.value = state.from;
    state.shardMaterial.uniforms.uTo.value = state.to;
    state.shardMaterial.uniforms.uMorph.value = 0;
    state.dustMaterial.uniforms.uFrom.value = state.from;
    state.dustMaterial.uniforms.uTo.value = state.to;
    state.dustMaterial.uniforms.uMorph.value = 0;
    state.lineMaterial.uniforms.uFrom.value = state.from;
    state.lineMaterial.uniforms.uTo.value = state.to;
    state.lineMaterial.uniforms.uMorph.value = 0;
    state.linkLines.visible = target === 0;
  }, [state, target]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const pointer = pointerRef.current;
    updateTouchField(state.touchField, pointer, delta);
    pointerScreenTarget.set(pointer.x, pointer.y);
    pointerScreenSmooth.lerp(pointerScreenTarget, 1 - Math.exp(-delta * 12));
    state.pointerStrength = THREE.MathUtils.damp(
      state.pointerStrength,
      pointer.active ? 1 : 0,
      6.5,
      delta
    );
    state.shardMaterial.uniforms.uPointerActive.value = state.pointerStrength;
    state.dustMaterial.uniforms.uPointerActive.value = state.pointerStrength;
    state.lineMaterial.uniforms.uPointerActive.value = state.pointerStrength;
    state.shardMaterial.uniforms.uPointerScreen.value.copy(pointerScreenSmooth);
    state.dustMaterial.uniforms.uPointerScreen.value.copy(pointerScreenSmooth);
    state.lineMaterial.uniforms.uPointerScreen.value.copy(pointerScreenSmooth);
    state.shardMaterial.uniforms.uTime.value = time;
    state.dustMaterial.uniforms.uTime.value = time;
    state.lineMaterial.uniforms.uTime.value = time;
    if (state.morph < 1) {
      state.morph = Math.min(1, state.morph + Math.min(0.05, delta) / 0.95);
      state.shardMaterial.uniforms.uMorph.value = state.morph;
      state.dustMaterial.uniforms.uMorph.value = state.morph;
      state.lineMaterial.uniforms.uMorph.value = state.morph;
      if (state.morph >= 1) {
        state.from = state.to;
      }
    }
    if (state.to === 0 && state.morph >= 1) {
      state.group.rotation.y += delta * 0.055;
    }
  });

  return (
    <primitive
      object={state.group}
      position={layout.position}
      scale={layout.scale}
    />
  );
}

function BrainPostProcessing() {
  const { camera, gl, scene, size } = useThree();
  const composer = useMemo(() => {
    const next = new EffectComposer(gl);
    next.addPass(new RenderPass(scene, camera));
    next.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        0.38,
        0.32,
        0.42
      )
    );
    return next;
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    return () => composer.dispose();
  }, [composer, size.height, size.width]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

function SceneContents(
  props: BrainSceneProps & { pointerRef: { current: BrainPointer } }
) {
  return (
    <>
      <color args={["#02060b"]} attach="background" />
      <fog args={["#02060b", 3.7, 7.5]} attach="fog" />
      <WisdomBrain mode={props.mode} pointerRef={props.pointerRef} />
      <OrbitControls
        autoRotate={props.mode === "brain"}
        autoRotateSpeed={0.28}
        enablePan={false}
        enableZoom={false}
      />
      <BrainPostProcessing />
    </>
  );
}

export function BrainScene(props: BrainSceneProps) {
  const pointerRef = useRef<BrainPointer>({ active: false, x: 0, y: 0 });
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerRef.current.active = true;
    },
    []
  );
  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);
  const handleCanvasCreated = useCallback(
    (state: {
      gl: THREE.WebGLRenderer;
      setSize: (width: number, height: number) => void;
    }) => {
      const parent = state.gl.domElement.parentElement;
      state.gl.outputColorSpace = THREE.SRGBColorSpace;
      state.gl.toneMapping = THREE.ACESFilmicToneMapping;
      state.gl.toneMappingExposure = 0.9;
      const rect = parent?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        state.setSize(rect.width, rect.height);
      }
    },
    []
  );

  return (
    <div
      aria-label="Interactive Principles knowledge graph"
      className="brain-canvas brain-canvas-interactive"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        camera={{ fov: 42, position: [0.08, 0.02, 4.04] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        onCreated={handleCanvasCreated}
        style={{ height: "100%", width: "100%" }}
      >
        <SceneContents {...props} pointerRef={pointerRef} />
      </Canvas>
    </div>
  );
}
