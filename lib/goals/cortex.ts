import "server-only";

export type GoalsCortexInput = {
  goal: string;
  problem: string;
  diagnosis?: string | null;
};

export type GoalsCortexSuggestion = {
  diagnosis?: string;
  principleCandidate?: string;
  actions?: string[];
};

export interface GoalsCortexClient {
  analyzeProblem(input: GoalsCortexInput): Promise<GoalsCortexSuggestion>;
}

class UnavailableGoalsCortexClient implements GoalsCortexClient {
  async analyzeProblem(): Promise<GoalsCortexSuggestion> {
    throw new Error("Cortex adapter is not configured");
  }
}

export const goalsCortex: GoalsCortexClient = new UnavailableGoalsCortexClient();
