export type BrainQualityTier = "full" | "reduced" | "static";

export type BrainPerformanceInput = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  override?: BrainQualityTier;
  reducedMotion?: boolean;
  viewportHeight?: number;
  viewportWidth?: number;
  webglAvailable?: boolean;
};

export type BrainPerformancePolicy = {
  animate: boolean;
  autoRotate: boolean;
  bloom: boolean;
  maxPixelRatio: number;
  particleCount: number;
  pointerEffects: boolean;
  shardCount: number;
  tier: BrainQualityTier;
};

const POLICIES: Readonly<Record<BrainQualityTier, BrainPerformancePolicy>> = {
  full: {
    animate: true,
    autoRotate: true,
    bloom: true,
    maxPixelRatio: 2,
    particleCount: 14_000,
    pointerEffects: true,
    shardCount: 6200,
    tier: "full",
  },
  reduced: {
    animate: true,
    autoRotate: false,
    bloom: false,
    maxPixelRatio: 1.25,
    particleCount: 6500,
    pointerEffects: true,
    shardCount: 2200,
    tier: "reduced",
  },
  static: {
    animate: false,
    autoRotate: false,
    bloom: false,
    maxPixelRatio: 1,
    particleCount: 0,
    pointerEffects: false,
    shardCount: 0,
    tier: "static",
  },
};

export function getBrainPerformancePolicy(
  input: BrainPerformanceInput = {}
): BrainPerformancePolicy {
  if (input.reducedMotion || input.webglAvailable === false) {
    return POLICIES.static;
  }

  if (input.override) {
    return POLICIES[input.override];
  }

  const width = input.viewportWidth ?? Number.POSITIVE_INFINITY;
  const height = input.viewportHeight ?? Number.POSITIVE_INFINITY;
  const memory = input.deviceMemory ?? Number.POSITIVE_INFINITY;
  const cores = input.hardwareConcurrency ?? Number.POSITIVE_INFINITY;

  if (width < 520 || height < 420 || memory < 4 || cores < 4) {
    return POLICIES.static;
  }

  if (width < 960 || memory < 8 || cores < 8) {
    return POLICIES.reduced;
  }

  return POLICIES.full;
}
