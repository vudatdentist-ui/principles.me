export type PrincipleCandidateStatus = "pending" | "adopted" | "rejected";

export type PrincipleCandidate = {
  basedOnJudgmentId: string;
  generatedAt: string;
  id: string;
  rationale: string;
  statement: string;
  status: PrincipleCandidateStatus;
  updatedAt: string;
};
