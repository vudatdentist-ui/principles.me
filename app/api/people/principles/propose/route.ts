import { z } from "zod";
import {
  consumePeopleAiQuota,
  peopleApiError,
  quotaResponse,
  requirePeopleMutation,
} from "@/features/people/api";
import { generatePrincipleProposal } from "@/features/people/ai";
import { persistAiPrincipleCandidate } from "@/features/people/principle-persistence";
import { projectPrinciple } from "@/features/people/projection";
import {
  getGoal,
  getProblem,
  getReflection,
} from "@/features/people/repository";

const schema = z.object({ reflectionId: z.string().uuid() });

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Reflection." }, { status: 400 });
    }
    const reflection = await getReflection(
      context.workspace.id,
      parsed.data.reflectionId
    );
    if (!reflection?.goalId || !reflection.problemId) {
      return Response.json({ error: "Reflection context was not found." }, { status: 404 });
    }
    const [goal, problem] = await Promise.all([
      getGoal(context.workspace.id, reflection.goalId),
      getProblem(context.workspace.id, reflection.problemId),
    ]);
    if (!goal || !problem || problem.goalId !== goal.id) {
      return Response.json({ error: "Reflection context was not found." }, { status: 404 });
    }
    const quota = await consumePeopleAiQuota(context, "people.principle_proposal");
    if (!quota.allowed) {
      return quotaResponse(quota.retryAfterSeconds);
    }
    const proposal = await generatePrincipleProposal({
      goal,
      problem,
      reflection,
      signal: request.signal,
    });
    const principle = await persistAiPrincipleCandidate({
      confidence: proposal.confidence,
      evidenceIds: problem.evidenceIds,
      modelName: proposal.modelName,
      modelProvider: proposal.modelProvider,
      rationale: proposal.rationale,
      reflectionId: reflection.id,
      rule: proposal.rule,
      trigger: proposal.trigger,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json(
      { principle: projectPrinciple(principle) },
      { status: 201 }
    );
  } catch (error) {
    return peopleApiError(error, "Could not propose a Principle.");
  }
}
