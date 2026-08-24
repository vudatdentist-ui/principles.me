import { z } from "zod";
import { createAiSuggestion } from "@/features/kernel/repository";
import {
  consumePeopleAiQuota,
  peopleApiError,
  quotaResponse,
  requirePeopleMutation,
} from "@/features/people/api";
import { generateDiagnosisProposal } from "@/features/people/execution-ai";
import { getProblemEvidenceContents } from "@/features/people/execution-repository";
import { supersedePendingExecutionSuggestions } from "@/features/people/execution-suggestions";
import { getGoal, getProblem, loadPeopleState } from "@/features/people/repository";

const schema = z.object({ problemId: z.string().uuid() });

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Problem." }, { status: 400 });
    }
    const problem = await getProblem(context.workspace.id, parsed.data.problemId);
    if (!problem) {
      return Response.json({ error: "Problem was not found." }, { status: 404 });
    }
    const goal = await getGoal(context.workspace.id, problem.goalId);
    if (!goal) {
      return Response.json({ error: "Goal was not found." }, { status: 404 });
    }
    const state = await loadPeopleState(context.workspace.id);
    const reflection =
      state.reflections.find((item) => item.problemId === problem.id) ?? null;
    const evidence = await getProblemEvidenceContents(context.workspace.id, problem.id);

    const quota = await consumePeopleAiQuota(context, "people.diagnosis_proposal");
    if (!quota.allowed) {
      return quotaResponse(quota.retryAfterSeconds);
    }
    const proposal = await generateDiagnosisProposal({
      evidence: evidence.map(({ content, title }) => ({ content, title })),
      goal,
      problem,
      reflection,
      signal: request.signal,
    });
    await supersedePendingExecutionSuggestions({
      contextId: problem.id,
      contextKey: "problemId",
      kind: "diagnosis_candidate",
      workspaceId: context.workspace.id,
    });
    await createAiSuggestion({
      evidenceIds: problem.evidenceIds,
      kind: "diagnosis_candidate",
      modelName: proposal.modelName,
      modelProvider: proposal.modelProvider,
      payload: {
        alternativeHypotheses: proposal.alternativeHypotheses,
        confidence: proposal.confidence,
        contradictingEvidence: proposal.contradictingEvidence,
        goalId: goal.id,
        problemId: problem.id,
        proximateCause: proposal.proximateCause,
        rootCauseHypothesis: proposal.rootCauseHypothesis,
        supportingEvidence: proposal.supportingEvidence,
        symptom: proposal.symptom,
        uncertainty: proposal.uncertainty,
      },
      requestedByUserId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({
      alternativeHypotheses: proposal.alternativeHypotheses,
      confidence: proposal.confidence,
      contradictingEvidence: proposal.contradictingEvidence,
      proximateCause: proposal.proximateCause,
      rootCauseHypothesis: proposal.rootCauseHypothesis,
      supportingEvidence: proposal.supportingEvidence,
      symptom: proposal.symptom,
      uncertainty: proposal.uncertainty,
    });
  } catch (error) {
    return peopleApiError(error, "Could not diagnose the Problem.");
  }
}
