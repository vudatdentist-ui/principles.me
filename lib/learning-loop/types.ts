export type DecisionQuality = "yes" | "no" | "unclear";
export type ReasoningQuality = "yes" | "no" | "partially";
export type AssumptionVerdict = "correct" | "incorrect" | "unclear";
export type PrincipleReviewAction = "keep" | "revise" | "retire";

export type AssumptionReviewInput = {
  assumptionText: string;
  note?: string;
  verdict: AssumptionVerdict;
};

export type ReviewSchedulePreset = "30_days" | "90_days" | "custom" | "none";
