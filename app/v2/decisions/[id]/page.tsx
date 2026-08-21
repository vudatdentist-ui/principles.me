import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function V2DecisionPage() {
  return (
    <V2Placeholder
      description="This route will render the immutable decision brief, evidence snapshot, and review state after the persistence workstream lands. The foundation intentionally avoids reading dynamic request data so the production build remains fully prerender-safe."
      eyebrow="Decision"
      links={[{ href: "/v2", label: "Back to ask" }]}
      title="A decision should remain inspectable."
    />
  );
}
