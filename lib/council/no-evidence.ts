import type { CouncilPlan } from "./types";

export type NoEvidenceReason = "NOT_CONFIGURED" | "EMPTY" | "UNAVAILABLE";

export function buildNoEvidenceCouncilAnswer({
  plan,
  reason,
}: {
  plan: CouncilPlan;
  reason: NoEvidenceReason;
}) {
  const caveat =
    reason === "NOT_CONFIGURED"
      ? "RAGFlow chưa được cấu hình dataset/API key."
      : reason === "UNAVAILABLE"
        ? "Các retrieval query đều không hoàn thành."
        : "RAGFlow không trả về chunk phù hợp cho các decision lenses.";

  return {
    answer:
      "Chưa có external evidence đủ liên quan từ RAGFlow để tạo một Council brief có căn cứ.",
    brief: null,
    caveats: [caveat],
    citations: [] as string[],
    grounded: false,
    plan,
    type: "answer" as const,
  };
}
