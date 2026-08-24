import { z } from "zod";
import { createAiSuggestion } from "@/features/kernel/repository";
import {
  consumePeopleAiQuota,
  peopleApiError,
  quotaResponse,
  requirePeopleMutation,
} from "@/features/people/api";
import { generateProblemProposal } from "@/features/people/ai";
import { getGoal, getReality } from "@/features/people/repository";

const schema = z.object({
  goalId: z.string().uuid(),
  observationId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Problem context." }, { status: 400 });
    }
    const [goal, reality] = await Promise.all([
      getGoal(context.workspace.id, parsed.data.goalId),
      getReality(context.workspace.id, parsed.data.observationId),
    ]);
    if (!goal || !reality || reality.goalId !== goal.id) {
      return Response.json({ error: "Goal or Reality was not found." }, { status: 404 });
    }
    const quota = await consumePeopleAiQuota(context, "people.problem_proposal");
    if (!quota.allowed) {
      return quotaResponse(quota.retryAfterSeconds);
    }
    const proposal = await generateProblemProposal({
      goal,
      reality,
      signal: request.signal,
    });
    const suggestionId = await createAiSuggestion({
      evidenceIds: [reality.evidenceId],
      kind: "problem_candidate",
      modelName: proposal.modelName,
      modelProvider: proposal.modelProvider,
      payload: {
        gap: proposal.gap,
        goalId: goal.id,
        observationId: reality.observationId,
        statement: proposal.statement,
      },
      requestedByUserId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({
      gap: proposal.gap,
      statement: proposal.statement,
      suggestionId,
    });
  } catch (error) {
    return peopleApiError(error, "Could not propose a Problem.");
  }
}
