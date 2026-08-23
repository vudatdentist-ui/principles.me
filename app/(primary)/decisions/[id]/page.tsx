import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function DecisionPage() {
  return (
    <V2Placeholder
      description="This route will render the immutable decision brief, evidence snapshot, and review state. Historical decision evidence remains inspectable rather than being regenerated from current data."
      eyebrow="Decision"
      links={[{ href: "/", label: "Back to ask" }]}
      title="A decision should remain inspectable."
    />
  );
}
