import { z } from "zod";
import { createAiSuggestion } from "@/features/kernel/repository";
import {
  consumePeopleAiQuota,
  peopleApiError,
  quotaResponse,
  requirePeopleMutation,
} from "@/features/people/api";
import { generateDesignProposal } from "@/features/people/execution-ai";
import { getDiagnosis } from "@/features/people/execution-repository";
import { getGoal, getProblem } from "@/features/people/repository";

const schema = z.object({ diagnosisId: z.string().uuid() });

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Diagnosis." }, { status: 400 });
    }
    const diagnosis = await getDiagnosis(context.workspace.id, parsed.data.diagnosisId);
    if (!diagnosis) {
      return Response.json({ error: "Diagnosis was not found." }, { status: 404 });
    }
    const [goal, problem] = await Promise.all([
      getGoal(context.workspace.id, diagnosis.goalId),
      getProblem(context.workspace.id, diagnosis.problemId),
    ]);
    if (!goal || !problem || problem.goalId !== goal.id) {
      return Response.json({ error: "Diagnosis context was not found." }, { status: 404 });
    }
    const quota = await consumePeopleAiQuota(context, "people.design_proposal");
    if (!quota.allowed) {
      return quotaResponse(quota.retryAfterSeconds);
    }
    const proposal = await generateDesignProposal({
      diagnosis,
      goal,
      problem,
      signal: request.signal,
    });
    await createAiSuggestion({
      evidenceIds: diagnosis.evidenceIds,
      kind: "design_candidate",
      modelName: proposal.modelName,
      modelProvider: proposal.modelProvider,
      payload: {
        actions: proposal.actions,
        diagnosisId: diagnosis.id,
        expectedResult: proposal.expectedResult,
        goalId: goal.id,
        machineChange: proposal.machineChange,
        problemId: problem.id,
        rationale: proposal.rationale,
        successSignal: proposal.successSignal,
      },
      requestedByUserId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({
      actions: proposal.actions,
      expectedResult: proposal.expectedResult,
      machineChange: proposal.machineChange,
      rationale: proposal.rationale,
      successSignal: proposal.successSignal,
    });
  } catch (error) {
    return peopleApiError(error, "Could not design the machine.");
  }
}
