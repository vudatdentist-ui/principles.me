import assert from "node:assert/strict";
import test from "node:test";
import {
  createCachedBrainCapabilityReader,
  getBrainPerformancePolicy,
} from "../brain-performance";

test("defaults to full quality when no constraints are reported", () => {
  assert.equal(getBrainPerformancePolicy().tier, "full");
});

test("reduced motion always selects the static policy", () => {
  const policy = getBrainPerformancePolicy({
    override: "full",
    reducedMotion: true,
  });
  assert.equal(policy.tier, "static");
  assert.equal(policy.animate, false);
});

test("missing WebGL selects the static policy", () => {
  assert.equal(
    getBrainPerformancePolicy({ webglAvailable: false }).tier,
    "static"
  );
});

test("moderate devices select reduced quality", () => {
  const policy = getBrainPerformancePolicy({
    deviceMemory: 4,
    hardwareConcurrency: 6,
    viewportHeight: 800,
    viewportWidth: 820,
    webglAvailable: true,
  });
  assert.equal(policy.tier, "reduced");
  assert.equal(policy.bloom, false);
  assert.ok(policy.particleCount > 0);
});

test("caller override is deterministic when accessibility allows it", () => {
  const policy = getBrainPerformancePolicy({
    deviceMemory: 2,
    hardwareConcurrency: 2,
    override: "reduced",
    reducedMotion: false,
    viewportWidth: 390,
    webglAvailable: true,
  });
  assert.equal(policy.tier, "reduced");
});

test("cached capability detection is reused across viewport decisions", () => {
  let detectionCount = 0;
  const readWebglAvailability = createCachedBrainCapabilityReader(() => {
    detectionCount += 1;
    return true;
  });

  const full = getBrainPerformancePolicy({
    viewportHeight: 800,
    viewportWidth: 1200,
    webglAvailable: readWebglAvailability(),
  });
  const reduced = getBrainPerformancePolicy({
    viewportHeight: 800,
    viewportWidth: 820,
    webglAvailable: readWebglAvailability(),
  });

  assert.equal(detectionCount, 1);
  assert.equal(full.tier, "full");
  assert.equal(reduced.tier, "reduced");
});
