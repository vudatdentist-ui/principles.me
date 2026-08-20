import "server-only";
import { Cortex } from "@/lib/cortex";

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
  analyzeProblem: (
    input: GoalsCortexInput,
    userId: string
  ) => Promise<GoalsCortexSuggestion>;
}

class LiveGoalsCortexClient implements GoalsCortexClient {
  async analyzeProblem(
    input: GoalsCortexInput,
    userId: string
  ): Promise<GoalsCortexSuggestion> {
    const response = await Cortex.run(
      {
        context: [
          `Goal: ${input.goal}`,
          input.diagnosis ? `Current diagnosis: ${input.diagnosis}` : null,
          "Analyze the obstacle, challenge the root cause, and suggest concrete next actions.",
        ]
          .filter(Boolean)
          .join("\n"),
        input: input.problem,
      },
      userId
    );
    if (response.status === "clarify") {
      return {
        diagnosis: response.clarification.questions
          .map((item) => item.question)
          .join(" "),
      };
    }
    return {
      actions: [
        response.result.recommendation.summary.text,
        ...response.result.recommendation.actions.map((item) => item.text),
      ].filter(Boolean),
      diagnosis: response.result.crux[0]?.text,
    };
  }
}

export const goalsCortex: GoalsCortexClient = new LiveGoalsCortexClient();
