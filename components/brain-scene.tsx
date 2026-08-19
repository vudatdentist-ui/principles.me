// biome-ignore-all lint/suspicious/noUnknownAttribute: React Three Fiber intrinsic props are not DOM attributes.
// biome-ignore-all lint/a11y/noStaticElementInteractions: Three.js meshes are the interactive graph nodes.
// biome-ignore-all lint/a11y/useAriaPropsSupportedByRole: The canvas wrapper labels the visual scene.
// biome-ignore-all lint/suspicious/noArrayIndexKey: Particle positions are deterministic and never reorder.

"use client";

import { OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
// biome-ignore lint/performance/noNamespaceImport: Three.js is used as a cohesive renderer namespace.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  type BrainMode,
  PRINCIPLES_LINKS,
  PRINCIPLES_NODES,
  type PrinciplesNode,
  THINKERS,
} from "@/lib/principles-graph";

type BrainSceneProps = {
  mode: BrainMode;
  selectedThinkerIds: string[];
  onSelectThinker?: (id: string) => void;
};

type WisdomBrainState = {
  anchorMaterial: THREE.PointsMaterial;
  anchors: THREE.Points;
  dustMaterial: THREE.ShaderMaterial;
  group: THREE.Group;
  lineMaterial: THREE.ShaderMaterial;
  morph: number;
  shardMaterial: THREE.ShaderMaterial;
  from: number;
  to: number;
};

const COUNT = 14_000;
const SHARD_COUNT = 6200;

const BASE_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil;
attribute vec3 aColor; attribute float aScale; attribute float aSeed;
uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uMorph;
varying vec3 vColor; varying float vPulse; varying float vEdge;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
mat2 r2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
 vec3 A=pick(uFrom),B=pick(uTo); float e=uMorph*uMorph*(3.0-2.0*uMorph); vec3 center=mix(A,B,e);
 float pulse=.92+.18*sin(uTime*1.2+aSeed*18.0); vec3 local=position*aScale*pulse;
 local.xy=r2(aSeed*6.283+uTime*.10)*local.xy; local.xz=r2(aSeed*3.7-uTime*.055)*local.xz;
 vec4 mv=modelViewMatrix*vec4(center+local,1.0); gl_Position=projectionMatrix*mv;
 vColor=aColor; vPulse=.88+.22*sin(uTime*1.35+aSeed*11.0); vEdge=clamp(length(position)*1.25,0.0,1.0);
}`;

const BASE_FRAGMENT =
  "precision highp float; varying vec3 vColor; varying float vPulse; varying float vEdge; uniform float uOpacity; void main(){ vec3 c=vColor*(.80+vPulse*.34); gl_FragColor=vec4(c,uOpacity); }";

const DUST_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil;
attribute vec3 aColor; attribute float aSeed;
uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uMorph;
varying vec3 vColor; varying float vAlpha;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
void main(){
 float e=uMorph*uMorph*(3.0-2.0*uMorph);
 vec3 p=mix(pick(uFrom),pick(uTo),e);
 float breathe=.004*sin(uTime*.8+aSeed*17.0);
 p += normalize(p+vec3(.0001))*breathe;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 float perspective=clamp(2.7/max(.8,-mv.z),.45,2.4);
 gl_PointSize=(1.15+2.65*aSeed*aSeed)*perspective;
 vColor=aColor; vAlpha=.23+.27*aSeed;
}`;

const DUST_FRAGMENT =
  "precision highp float; varying vec3 vColor; varying float vAlpha; void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); float a=smoothstep(.50,.10,d)*vAlpha; if(a<.015) discard; gl_FragColor=vec4(vColor*.94,a); }";

const LINE_VERTEX = `
attribute vec3 aBrain; attribute vec3 aGraph; attribute vec3 aThinker; attribute vec3 aCouncil; attribute vec3 aColor;
uniform float uFrom;uniform float uTo;uniform float uMorph; varying vec3 vColor;
vec3 pick(float m){if(m<0.5)return aBrain;if(m<1.5)return aGraph;if(m<2.5)return aThinker;return aCouncil;}
void main(){float e=uMorph*uMorph*(3.0-2.0*uMorph);vec3 p=mix(pick(uFrom),pick(uTo),e);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vColor=aColor;}`;

const LINE_FRAGMENT =
  "precision highp float; varying vec3 vColor; uniform float uLineOpacity; void main(){gl_FragColor=vec4(vColor*1.58,uLineOpacity);}";

function seeded(index: number, salt = 12.9898) {
  return Math.abs(Math.sin(index * salt) * 43_758.5453) % 1;
}

function gaussian(index: number, salt: number) {
  const u = Math.max(0.0001, seeded(index, salt));
  const v = seeded(index, salt + 3.7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283_185 * v);
}

function colorFor(point: THREE.Vector3) {
  let color: THREE.Color;
  if (point.x < -0.26) {
    color = new THREE.Color(point.y > 0.02 ? "#4f8fff" : "#32e8ff");
  } else if (point.x > 0.26) {
    color = new THREE.Color(point.y > 0.06 ? "#ff708d" : "#d46dff");
  } else if (point.y < -0.18) {
    color = new THREE.Color(point.z > -0.25 ? "#52eea8" : "#ffc15f");
  } else {
    color = new THREE.Color("#b07dff");
  }
  return color.lerp(
    new THREE.Color("#ffffff"),
    0.018 + seeded(Math.floor((point.x + point.y + point.z) * 1000), 17) * 0.05
  );
}

function uniformSet() {
  return {
    uFrom: { value: 0 },
    uMorph: { value: 1 },
    uTime: { value: 0 },
    uTo: { value: 0 },
  };
}

function createWisdomBrain(gltf: { scene: THREE.Group }): WisdomBrainState {
  const group = new THREE.Group();
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
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  const sample = new THREE.Vector3();
  const normal = new THREE.Vector3();
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
    const mesh = meshes[index % meshes.length];
    samplers[index % samplers.length].sample(sample, normal);
    sample.applyMatrix4(mesh.matrixWorld).multiplyScalar(1.3);
    brain.set([sample.x, sample.y, sample.z], index * 3);
    colors.set(colorFor(sample).toArray(), index * 3);
    seeds[index] = seeded(index, 17);
    scales[index] = 0.0058 + 0.0124 * seeded(index, 31) ** 2;

    const cluster = index % 6;
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
  dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const dustUniforms = uniformSet();
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
  const octahedron = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
  shardGeometry.setAttribute("position", octahedron.getAttribute("position"));
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
    "aScale",
    new THREE.InstancedBufferAttribute(scales, 1)
  );
  shardGeometry.setAttribute(
    "aSeed",
    new THREE.InstancedBufferAttribute(seeds, 1)
  );
  shardGeometry.instanceCount = SHARD_COUNT;
  const shardUniforms = { ...uniformSet(), uOpacity: { value: 0.6 } };
  const shardMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: BASE_FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: shardUniforms,
    vertexShader: BASE_VERTEX,
  });
  const shards = new THREE.Mesh(shardGeometry, shardMaterial);
  shards.frustumCulled = false;
  group.add(shards);

  const pairs: [number, number][] = [];
  let attempts = 0;
  while (pairs.length < 860 && attempts < 12_000) {
    attempts += 1;
    const first = Math.floor(seeded(attempts, 61) * COUNT);
    const second = (first + 1 + Math.floor(seeded(attempts, 67) * 180)) % COUNT;
    const distance =
      (brain[first * 3] - brain[second * 3]) ** 2 +
      (brain[first * 3 + 1] - brain[second * 3 + 1]) ** 2 +
      (brain[first * 3 + 2] - brain[second * 3 + 2]) ** 2;
    if (distance < 0.065) {
      pairs.push([first, second]);
    }
  }
  const lineSize = pairs.length * 2;
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(lineSize * 3), 3)
  );
  const lineValues = { brain, colors, council, graph, thinker };
  for (const [name, values] of Object.entries(lineValues)) {
    const lineAttribute = new Float32Array(lineSize * 3);
    let cursor = 0;
    for (const [first, second] of pairs) {
      for (const source of [first, second]) {
        lineAttribute.set(values.slice(source * 3, source * 3 + 3), cursor * 3);
        cursor += 1;
      }
    }
    lineGeometry.setAttribute(
      `a${name[0].toUpperCase()}${name.slice(1)}`,
      new THREE.BufferAttribute(lineAttribute, 3)
    );
  }
  const lineUniforms = {
    uFrom: shardUniforms.uFrom,
    uLineOpacity: { value: 0.105 },
    uMorph: shardUniforms.uMorph,
    uTo: shardUniforms.uTo,
  };
  const lineMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: LINE_FRAGMENT,
    transparent: true,
    uniforms: lineUniforms,
    vertexShader: LINE_VERTEX,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  group.add(lines);

  const anchorPositions = new Float32Array(96 * 3);
  const anchorColors = new Float32Array(96 * 3);
  for (let index = 0; index < 96; index += 1) {
    const source =
      (index * Math.floor(COUNT / 96) + Math.floor(seeded(index, 91) * 37)) %
      COUNT;
    anchorPositions.set(brain.slice(source * 3, source * 3 + 3), index * 3);
    anchorColors.set(
      [
        Math.min(1, colors[source * 3] * 1.35),
        Math.min(1, colors[source * 3 + 1] * 1.35),
        Math.min(1, colors[source * 3 + 2] * 1.35),
      ],
      index * 3
    );
  }
  const anchorGeometry = new THREE.BufferGeometry();
  anchorGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(anchorPositions, 3)
  );
  anchorGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(anchorColors, 3)
  );
  const anchorMaterial = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.82,
    size: 0.042,
    transparent: true,
    vertexColors: true,
  });
  const anchors = new THREE.Points(anchorGeometry, anchorMaterial);
  group.add(anchors);

  return {
    anchorMaterial,
    anchors,
    dustMaterial,
    from: 0,
    group,
    lineMaterial,
    morph: 1,
    shardMaterial,
    to: 0,
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

function WisdomBrain({ mode }: { mode: BrainMode }) {
  const gltf = useLoader(GLTFLoader, "/brain.glb") as unknown as {
    scene: THREE.Group;
  };
  const state = useMemo(() => createWisdomBrain(gltf), [gltf]);
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
    state.lineMaterial.uniforms.uLineOpacity.value =
      target === 1 ? 0.19 : target === 0 ? 0.1 : 0.055;
    state.anchorMaterial.opacity = target === 0 ? 0.78 : 0;
  }, [state, target]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    state.shardMaterial.uniforms.uTime.value = time;
    state.dustMaterial.uniforms.uTime.value = time;
    if (state.morph < 1) {
      state.morph = Math.min(1, state.morph + Math.min(0.05, delta) / 0.95);
      state.shardMaterial.uniforms.uMorph.value = state.morph;
      state.dustMaterial.uniforms.uMorph.value = state.morph;
      if (state.morph >= 1) {
        state.from = state.to;
      }
    }
    if (state.to === 0 && state.morph >= 1) {
      state.group.rotation.y += delta * 0.035;
      state.anchorMaterial.size = 0.04 + 0.006 * Math.sin(time * 1.92);
      state.anchorMaterial.opacity = 0.72 + 0.08 * Math.sin(time * 1.22);
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

function GraphLine({
  source,
  target,
  accent,
}: {
  source: PrinciplesNode;
  target: PrinciplesNode;
  accent: string;
}) {
  const points = useMemo(
    () =>
      new Float32Array([
        source.x,
        source.y,
        source.z,
        target.x,
        target.y,
        target.z,
      ]),
    [source, target]
  );
  return (
    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute args={[points, 3]} attach="attributes-position" />
      </bufferGeometry>
      <lineBasicMaterial color={accent} opacity={0.3} transparent />
    </line>
  );
}

function KnowledgeGraph({
  mode,
  selectedThinkerIds,
  onSelectThinker,
}: BrainSceneProps) {
  const visibleThinkers = new Set(
    selectedThinkerIds.length
      ? selectedThinkerIds
      : THINKERS.map((thinker) => thinker.id)
  );
  const nodes = PRINCIPLES_NODES.filter(
    (node) => !node.thinkerId || visibleThinkers.has(node.thinkerId)
  );
  const nodeMap = new Map(PRINCIPLES_NODES.map((node) => [node.id, node]));
  return (
    <group
      scale={mode === "graph" ? 1.05 : mode === "constellation" ? 1.12 : 0.82}
    >
      {PRINCIPLES_LINKS.map((link) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (
          !source ||
          !target ||
          mode === "constellation" ||
          !visibleThinkers.has(source.thinkerId ?? "") ||
          !visibleThinkers.has(target.thinkerId ?? "")
        ) {
          return null;
        }
        return (
          <GraphLine
            accent={link.relation === "contrasts" ? "#ff708d" : source.accent}
            key={`${link.source}-${link.target}`}
            source={source}
            target={target}
          />
        );
      })}
      {nodes.map((node) => {
        const thinker = node.thinkerId
          ? THINKERS.find((item) => item.id === node.thinkerId)
          : undefined;
        const isThinker = node.type === "thinker";
        return (
          <mesh
            key={node.id}
            // biome-ignore lint/performance/noJsxPropsBind: R3F interaction is intentionally bound to graph nodes.
            onClick={(event) => {
              event.stopPropagation();
              if (thinker && isThinker) {
                onSelectThinker?.(thinker.id);
              }
            }}
            position={[node.x, node.y, node.z]}
          >
            <sphereGeometry
              args={[
                isThinker ? 0.1 : 0.035,
                isThinker ? 18 : 10,
                isThinker ? 18 : 10,
              ]}
            />
            <meshBasicMaterial
              color={node.accent}
              opacity={isThinker ? 0.94 : 0.7}
              transparent
            />
          </mesh>
        );
      })}
    </group>
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
        0.82,
        0.38,
        0.26
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

function SceneContents(props: BrainSceneProps) {
  return (
    <>
      <color args={["#02060b"]} attach="background" />
      <fog args={["#02060b", 3.7, 7.5]} attach="fog" />
      <WisdomBrain mode={props.mode} />
      {props.mode === "brain" ? null : <KnowledgeGraph {...props} />}
      <Sparkles
        color="#8b7dff"
        count={props.mode === "brain" ? 90 : 45}
        scale={4.8}
        size={1.3}
        speed={0.16}
      />
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
  const handleCanvasCreated = useCallback(
    (state: {
      gl: THREE.WebGLRenderer;
      setSize: (width: number, height: number) => void;
    }) => {
      const parent = state.gl.domElement.parentElement;
      state.gl.outputColorSpace = THREE.SRGBColorSpace;
      state.gl.toneMapping = THREE.ACESFilmicToneMapping;
      state.gl.toneMappingExposure = 0.93;
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
      className={`brain-canvas${props.mode === "graph" ? " brain-canvas-interactive" : ""}`}
    >
      <Canvas
        camera={{ fov: 42, position: [0.08, 0.02, 4.04] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        onCreated={handleCanvasCreated}
        style={{ height: "100%", width: "100%" }}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
