import {
  consumeLearningAiQuota,
  learningApiError,
  learningQuotaResponse,
  requireLearningMutation,
} from "@/features/learning/api";
import { generateLearningPattern } from "@/features/learning/ai";
import { loadLearningProposalCases } from "@/features/learning/history";
import { projectLearningCase } from "@/features/learning/projection";
import {
  loadLearningPrinciples,
  persistLearningSuggestion,
} from "@/features/learning/repository";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireLearningMutation(request);
    const [cases, principles] = await Promise.all([
      loadLearningProposalCases(context.workspace.id),
      loadLearningPrinciples(context.workspace.id),
    ]);
    if (cases.length < 2) {
      return Response.json(
        { error: "Not enough completed Reflection history yet." },
        { status: 409 }
      );
    }

    const quota = await consumeLearningAiQuota(context);
    if (!quota.allowed) {
      return learningQuotaResponse(quota.retryAfterSeconds);
    }

    const generated = await generateLearningPattern({
      cases,
      principles,
      signal: request.signal,
    });
    await persistLearningSuggestion({
      caseReflectionIds: generated.caseReflectionIds,
      confidence: generated.confidence,
      contradictingEvidence: generated.contradictingEvidence,
      implication: generated.implication,
      kind: generated.kind,
      modelName: generated.modelName,
      modelProvider: generated.modelProvider,
      principleRevision: generated.principleRevision,
      requestedByUserId: context.user.id,
      statement: generated.statement,
      supportingEvidence: generated.supportingEvidence,
      uncertainty: generated.uncertainty,
      workspaceId: context.workspace.id,
    });

    const caseIds = new Set(generated.caseReflectionIds);
    const selectedCases = cases
      .filter((item) => caseIds.has(item.reflectionId))
      .map(projectLearningCase);
    const targetPrinciple = generated.principleRevision
      ? principles.find(
          (item) => item.id === generated.principleRevision?.principleId
        )
      : null;

    return Response.json({
      cases: selectedCases,
      confidence: generated.confidence,
      contradictingEvidence: generated.contradictingEvidence,
      implication: generated.implication,
      kind: generated.kind,
      principleRevision:
        generated.principleRevision && targetPrinciple
          ? {
              currentRationale: targetPrinciple.rationale,
              currentRule: targetPrinciple.rule,
              currentTrigger: targetPrinciple.trigger,
              principleId: targetPrinciple.id,
              proposedRationale:
                generated.principleRevision.proposedRationale,
              proposedRule: generated.principleRevision.proposedRule,
              proposedTrigger: generated.principleRevision.proposedTrigger,
            }
          : null,
      statement: generated.statement,
      supportingEvidence: generated.supportingEvidence,
      uncertainty: generated.uncertainty,
    });
  } catch (error) {
    return learningApiError(error, "Could not find a Learning Pattern.");
  }
}
