export type PrincipleCandidateStatus = "pending" | "adopted" | "rejected";

/** A candidate remains a proposal until the user explicitly adopts it. */
export type PrincipleCandidate = {
  basedOnJudgmentId: string;
  generatedAt: string;
  id: string;
  rationale: string;
  statement: string;
  status: PrincipleCandidateStatus;
  updatedAt: string;
};
