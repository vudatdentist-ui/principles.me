"use client";

import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { BrainFallback } from "./brain-fallback";
import {
  getBrainPerformancePolicy,
  type BrainPerformancePolicy,
  type BrainQualityTier,
} from "./brain-performance";
import type { BrainGraph, BrainView } from "./brain-types";

const LazyBrainScene = lazy(() =>
  import("./brain-scene").then((module) => ({ default: module.BrainScene }))
);

type BrainLoaderProps = {
  ariaLabel?: string;
  className?: string;
  graph: BrainGraph;
  quality?: BrainQualityTier;
  summary?: string;
  view?: BrainView;
};

type RuntimeDecision = {
  policy: BrainPerformancePolicy;
  reducedMotion: boolean;
  webglAvailable: boolean;
};

type BrainErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type BrainErrorBoundaryState = {
  failed: boolean;
};

class BrainErrorBoundary extends Component<
  BrainErrorBoundaryProps,
  BrainErrorBoundaryState
> {
  state: BrainErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // The feature intentionally degrades to its quiet fallback. Integration
    // code may add observability later without coupling the renderer to it.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function supportsWebgl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function readRuntimeDecision(
  quality: BrainQualityTier | undefined,
  reducedMotion: boolean
): RuntimeDecision {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const webglAvailable = supportsWebgl();

  return {
    policy: getBrainPerformancePolicy({
      deviceMemory: navigatorWithMemory.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      override: quality,
      reducedMotion,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      webglAvailable,
    }),
    reducedMotion,
    webglAvailable,
  };
}

const visuallyHiddenStyle = {
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
} as const;

export function BrainLoader({
  ariaLabel = "Interactive Principles knowledge graph",
  className,
  graph,
  quality,
  summary,
  view = "brain",
}: BrainLoaderProps) {
  const [runtime, setRuntime] = useState<RuntimeDecision | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setRuntime(readRuntimeDecision(quality, media.matches));

    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [quality]);

  const accessibleSummary = useMemo(
    () =>
      summary ??
      `${graph.nodes.length} knowledge nodes connected by ${graph.links.length} relationships.`,
    [graph.links.length, graph.nodes.length, summary]
  );

  if (graph.nodes.length === 0) {
    return (
      <BrainFallback
        ariaLabel={ariaLabel}
        className={className}
        graph={graph}
        reason="empty"
        summary={summary}
      />
    );
  }

  if (!runtime) {
    return (
      <BrainFallback
        ariaLabel={ariaLabel}
        className={className}
        graph={graph}
        reason="loading"
        summary={summary}
      />
    );
  }

  if (runtime.policy.tier === "static") {
    const reason = runtime.reducedMotion
      ? "reduced-motion"
      : runtime.webglAvailable
        ? "static"
        : "unsupported";
    return (
      <BrainFallback
        ariaLabel={ariaLabel}
        className={className}
        graph={graph}
        reason={reason}
        summary={summary}
      />
    );
  }

  const errorFallback = (
    <BrainFallback
      ariaLabel={ariaLabel}
      className={className}
      graph={graph}
      reason="error"
      summary={summary}
    />
  );

  return (
    <BrainErrorBoundary
      fallback={errorFallback}
      key={`${view}:${runtime.policy.tier}:${graph.nodes.length}:${graph.links.length}`}
    >
      <Suspense
        fallback={
          <BrainFallback
            ariaLabel={ariaLabel}
            className={className}
            graph={graph}
            reason="loading"
            summary={summary}
          />
        }
      >
        <div className={className} style={{ position: "relative" }}>
          <span style={visuallyHiddenStyle}>{accessibleSummary}</span>
          <LazyBrainScene
            ariaLabel={ariaLabel}
            graph={graph}
            policy={runtime.policy}
            view={view}
          />
        </div>
      </Suspense>
    </BrainErrorBoundary>
  );
}
