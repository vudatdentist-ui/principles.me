import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default async function V2DecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <V2Placeholder
      description={`Decision ${id} will render the immutable brief, evidence snapshot, and review state after the persistence workstream lands.`}
      eyebrow="Decision"
      links={[{ href: "/v2", label: "Back to ask" }]}
      title="A decision should remain inspectable."
    />
  );
}
