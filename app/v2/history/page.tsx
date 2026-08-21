import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function V2HistoryPage() {
  return (
    <V2Placeholder
      description="History will list recent decisions and the decisions that are due for review. It will not be a transcript-first chat archive."
      eyebrow="History"
      links={[{ href: "/v2", label: "Back to ask" }]}
      title="Decisions, outcomes, lessons."
    />
  );
}
