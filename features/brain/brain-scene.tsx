// biome-ignore-all lint/suspicious/noUnknownAttribute: React Three Fiber intrinsic props are not DOM attributes.
// biome-ignore-all lint/a11y/noStaticElementInteractions: The canvas pointer surface does not replace keyboard-accessible product controls.

"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
// biome-ignore lint/performance/noNamespaceImport: Three.js is used as a cohesive renderer namespace.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { BrainPerformancePolicy } from "./brain-performance";
import {
  BRAIN_DUST_FRAGMENT,
  BRAIN_DUST_VERTEX,
  BRAIN_LINK_FRAGMENT,
  BRAIN_LINK_VERTEX,
  BRAIN_SHARD_FRAGMENT,
  BRAIN_SHARD_VERTEX,
} from "./brain-shaders";
import { adaptBrainGraph, type RenderableBrainGraph } from "./graph-adapter";
import type { BrainGraph, BrainNodeType, BrainView } from "./brain-types";

type BrainSceneProps = {
  ariaLabel: string;
  graph: BrainGraph;
  policy: BrainPerformancePolicy;
  view: BrainView;
};

type BrainPointer = {
  active: boolean;
  x: number;
  y: number;
};

type BrainRendererState = {
  dustMaterial: THREE.ShaderMaterial;
  group: THREE.Group;
  lineMaterial: THREE.ShaderMaterial;
  morph: number;
  shardMaterial: THREE.ShaderMaterial;
};

const TYPE_COLORS: Readonly<Record<BrainNodeType, string>> = {
  decision: "#ffd21f",
  evidence: "#20e6d1",
  goal: "#ff721a",
  outcome: "#ff3f92",
  principle: "#9c3fff",
};

function seeded(index: number, salt = 12.9898) {
  return Math.abs(Math.sin(index * salt) * 43_758.5453) % 1;
}

function gaussian(index: number, salt: number) {
  const u = Math.max(0.0001, seeded(index, salt));
  const v = seeded(index, salt + 3.7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function createUniforms(initialMorph: number) {
  return {
    uMorph: { value: initialMorph },
    uPointerActive: { value: 0 },
    uPointerScreen: { value: new THREE.Vector2() },
    uTime: { value: 0 },
  };
}

function sampleBrainPositions(gltf: { scene: THREE.Group }, count: number) {
  const meshes: THREE.Mesh[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object);
    }
  });
  if (meshes.length === 0) {
    throw new Error("The Principles brain asset contains no mesh.");
  }

  const samplers = meshes.map((mesh) => new MeshSurfaceSampler(mesh).build());
  const positions = new Float32Array(count * 3);
  const sample = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < count; index += 1) {
    const meshIndex = index % meshes.length;
    samplers[meshIndex].sample(sample, normal);
    sample.applyMatrix4(meshes[meshIndex].matrixWorld).multiplyScalar(1.3);
    positions.set([sample.x, sample.y, sample.z], index * 3);
  }

  return positions;
}

function createGraphParticlePositions(
  graph: RenderableBrainGraph,
  count: number
) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const node = graph.nodes[index % graph.nodes.length];
    const spread = 0.055 + 0.035 / Math.max(0.5, node.weight);
    positions.set(
      [
        node.position[0] + gaussian(index, 13) * spread,
        node.position[1] + gaussian(index, 19) * spread,
        node.position[2] + gaussian(index, 23) * spread,
      ],
      index * 3
    );
    const color = new THREE.Color(TYPE_COLORS[node.type]);
    color.lerp(new THREE.Color("#ffffff"), seeded(index, 71) * 0.08);
    colors.set(color.toArray(), index * 3);
    scales[index] = 0.007 + 0.018 * seeded(index, 31) ** 1.6;
    seeds[index] = seeded(index, 17);
  }

  return { colors, positions, scales, seeds };
}

function createLinkPositions(
  graph: RenderableBrainGraph,
  brainPositions: Float32Array
) {
  const brain = new Float32Array(graph.links.length * 6);
  const rendered = new Float32Array(graph.links.length * 6);
  const particleCount = Math.max(1, brainPositions.length / 3);

  graph.links.forEach((link, index) => {
    const source = graph.nodes[link.sourceIndex];
    const target = graph.nodes[link.targetIndex];
    const sourceBrainIndex = hashString(source.id) % particleCount;
    const targetBrainIndex = hashString(target.id) % particleCount;

    brain.set(
      brainPositions.slice(sourceBrainIndex * 3, sourceBrainIndex * 3 + 3),
      index * 6
    );
    brain.set(
      brainPositions.slice(targetBrainIndex * 3, targetBrainIndex * 3 + 3),
      index * 6 + 3
    );
    rendered.set(source.position, index * 6);
    rendered.set(target.position, index * 6 + 3);
  });

  return { brain, rendered };
}

function createRendererState(
  gltf: { scene: THREE.Group },
  graph: RenderableBrainGraph,
  policy: BrainPerformancePolicy,
  initialMorph: number
): BrainRendererState {
  const count = policy.particleCount;
  const group = new THREE.Group();
  const brainPositions = sampleBrainPositions(gltf, count);
  const graphParticles = createGraphParticlePositions(graph, count);

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(count * 3), 3)
  );
  dustGeometry.setAttribute(
    "aBrain",
    new THREE.BufferAttribute(brainPositions, 3)
  );
  dustGeometry.setAttribute(
    "aGraph",
    new THREE.BufferAttribute(graphParticles.positions, 3)
  );
  dustGeometry.setAttribute(
    "aColor",
    new THREE.BufferAttribute(graphParticles.colors, 3)
  );
  dustGeometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(graphParticles.seeds, 1)
  );
  const dustMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: BRAIN_DUST_FRAGMENT,
    transparent: true,
    uniforms: createUniforms(initialMorph),
    vertexShader: BRAIN_DUST_VERTEX,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  group.add(dust);

  const tetrahedron = new THREE.TetrahedronGeometry(1, 0);
  const shardEdges = new THREE.EdgesGeometry(tetrahedron);
  const shardGeometry = new THREE.InstancedBufferGeometry();
  shardGeometry.setAttribute("position", shardEdges.getAttribute("position"));
  shardGeometry.setAttribute(
    "aBrain",
    new THREE.InstancedBufferAttribute(brainPositions, 3)
  );
  shardGeometry.setAttribute(
    "aGraph",
    new THREE.InstancedBufferAttribute(graphParticles.positions, 3)
  );
  shardGeometry.setAttribute(
    "aColor",
    new THREE.InstancedBufferAttribute(graphParticles.colors, 3)
  );
  shardGeometry.setAttribute(
    "aScale",
    new THREE.InstancedBufferAttribute(graphParticles.scales, 1)
  );
  shardGeometry.setAttribute(
    "aSeed",
    new THREE.InstancedBufferAttribute(graphParticles.seeds, 1)
  );
  shardGeometry.instanceCount = Math.min(policy.shardCount, count);
  const shardMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: BRAIN_SHARD_FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      ...createUniforms(initialMorph),
      uOpacity: { value: policy.tier === "full" ? 0.66 : 0.54 },
    },
    vertexShader: BRAIN_SHARD_VERTEX,
  });
  const shards = new THREE.LineSegments(shardGeometry, shardMaterial);
  shards.frustumCulled = false;
  group.add(shards);
  tetrahedron.dispose();
  shardEdges.dispose();

  const linkPositions = createLinkPositions(graph, brainPositions);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(linkPositions.rendered, 3)
  );
  lineGeometry.setAttribute(
    "aBrain",
    new THREE.BufferAttribute(linkPositions.brain, 3)
  );
  lineGeometry.setAttribute(
    "aGraph",
    new THREE.BufferAttribute(linkPositions.rendered, 3)
  );
  const lineMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: BRAIN_LINK_FRAGMENT,
    transparent: true,
    uniforms: {
      uMorph: { value: initialMorph },
      uOpacity: { value: policy.tier === "full" ? 0.8 : 0.58 },
      uTime: { value: 0 },
    },
    vertexShader: BRAIN_LINK_VERTEX,
  });
  const links = new THREE.LineSegments(lineGeometry, lineMaterial);
  links.frustumCulled = false;
  group.add(links);

  return {
    dustMaterial,
    group,
    lineMaterial,
    morph: initialMorph,
    shardMaterial,
  };
}

function disposeRendererState(state: BrainRendererState) {
  state.group.traverse((object) => {
    if (object instanceof THREE.Points || object instanceof THREE.LineSegments) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}

function WisdomBrain({
  graph,
  pointerRef,
  policy,
  view,
}: {
  graph: RenderableBrainGraph;
  pointerRef: { current: BrainPointer };
  policy: BrainPerformancePolicy;
  view: BrainView;
}) {
  const gltf = useLoader(GLTFLoader, "/brain.glb") as unknown as {
    scene: THREE.Group;
  };
  const [initialMorph] = useState(() => (view === "graph" ? 1 : 0));
  const state = useMemo(
    () => createRendererState(gltf, graph, policy, initialMorph),
    [gltf, graph, initialMorph, policy]
  );
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);
  const pointerSmooth = useMemo(() => new THREE.Vector2(), []);
  const pointerStrength = useRef(0);
  const targetMorph = view === "graph" ? 1 : 0;

  useEffect(() => () => disposeRendererState(state), [state]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const pointer = pointerRef.current;
    pointerTarget.set(pointer.x, pointer.y);
    pointerSmooth.lerp(pointerTarget, 1 - Math.exp(-delta * 12));
    pointerStrength.current = THREE.MathUtils.damp(
      pointerStrength.current,
      pointer.active && policy.pointerEffects ? 1 : 0,
      6.5,
      delta
    );
    state.morph = THREE.MathUtils.damp(state.morph, targetMorph, 4.2, delta);

    for (const material of [state.shardMaterial, state.dustMaterial]) {
      material.uniforms.uTime.value = time;
      material.uniforms.uMorph.value = state.morph;
      material.uniforms.uPointerActive.value = pointerStrength.current;
      material.uniforms.uPointerScreen.value.copy(pointerSmooth);
    }
    state.lineMaterial.uniforms.uTime.value = time;
    state.lineMaterial.uniforms.uMorph.value = state.morph;
  });

  const layout =
    view === "brain"
      ? { position: [0.45, -0.02, 0] as [number, number, number], scale: 1.08 }
      : { position: [0, -0.04, 0] as [number, number, number], scale: 1.05 };

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
        0.34,
        0.3,
        0.44
      )
    );
    return next;
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    return () => composer.dispose();
  }, [composer, size.height, size.width]);

  useFrame(() => composer.render(), 1);
  return null;
}

function SceneContents({
  graph,
  pointerRef,
  policy,
  view,
}: {
  graph: RenderableBrainGraph;
  pointerRef: { current: BrainPointer };
  policy: BrainPerformancePolicy;
  view: BrainView;
}) {
  return (
    <>
      <color args={["#02060b"]} attach="background" />
      <fog args={["#02060b", 3.7, 7.5]} attach="fog" />
      <WisdomBrain
        graph={graph}
        pointerRef={pointerRef}
        policy={policy}
        view={view}
      />
      <OrbitControls
        autoRotate={policy.autoRotate && view === "brain"}
        autoRotateSpeed={0.28}
        enablePan={false}
        enableZoom={false}
      />
      {policy.bloom ? <BrainPostProcessing /> : null}
    </>
  );
}

export function BrainScene({ ariaLabel, graph, policy, view }: BrainSceneProps) {
  const pointerRef = useRef<BrainPointer>({ active: false, x: 0, y: 0 });
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || !document.hidden
  );
  const renderableGraph = useMemo(() => adaptBrainGraph(graph), [graph]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!policy.pointerEffects) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerRef.current.active = true;
    },
    [policy.pointerEffects]
  );
  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);
  const handleCanvasCreated = useCallback(
    (state: { gl: THREE.WebGLRenderer }) => {
      state.gl.outputColorSpace = THREE.SRGBColorSpace;
      state.gl.toneMapping = THREE.ACESFilmicToneMapping;
      state.gl.toneMappingExposure = 0.9;
    },
    []
  );
  const shouldAnimate = policy.animate && documentVisible;

  return (
    <div
      aria-label={ariaLabel}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      role="img"
      style={{ height: "100%", minHeight: 320, width: "100%" }}
    >
      <Canvas
        camera={{ fov: 42, position: [0.08, 0.02, 4.04] }}
        dpr={[1, policy.maxPixelRatio]}
        frameloop={shouldAnimate ? "always" : "demand"}
        gl={{ alpha: true, antialias: policy.tier === "full" }}
        onCreated={handleCanvasCreated}
        style={{ height: "100%", width: "100%" }}
      >
        <SceneContents
          graph={renderableGraph}
          pointerRef={pointerRef}
          policy={policy}
          view={view}
        />
      </Canvas>
    </div>
  );
}
