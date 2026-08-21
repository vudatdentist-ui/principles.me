import type { BrainGraph } from "./brain-types";

export type BrainFallbackReason =
  | "empty"
  | "error"
  | "loading"
  | "reduced-motion"
  | "static"
  | "unsupported";

type BrainFallbackProps = {
  ariaLabel: string;
  className?: string;
  graph: BrainGraph;
  reason: BrainFallbackReason;
  summary?: string;
};

const reasonCopy: Readonly<Record<BrainFallbackReason, string>> = {
  empty: "No relationships are available to visualize yet.",
  error: "The interactive graph could not be started.",
  loading: "Loading the interactive graph.",
  "reduced-motion": "Motion is reduced, so the interactive graph is paused.",
  static: "A lightweight static view is being used on this device.",
  unsupported: "Interactive WebGL rendering is not available on this device.",
};

export function BrainFallback({
  ariaLabel,
  className,
  graph,
  reason,
  summary,
}: BrainFallbackProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={className}
      data-brain-fallback={reason}
      style={{
        alignItems: "center",
        border: "1px solid currentColor",
        borderRadius: 12,
        display: "grid",
        gap: 8,
        minHeight: 220,
        opacity: 0.72,
        padding: 24,
      }}
    >
      <strong>{ariaLabel}</strong>
      <p style={{ margin: 0 }}>{summary ?? reasonCopy[reason]}</p>
      <small>
        {graph.nodes.length} nodes · {graph.links.length} relationships
      </small>
    </section>
  );
}
