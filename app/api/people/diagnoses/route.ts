import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import { projectDiagnosis } from "@/features/people/execution-projection";
import { createDiagnosis } from "@/features/people/execution-repository";
import { getProblem } from "@/features/people/repository";

const schema = z.object({
  alternativeHypotheses: z.string().trim().max(1400).optional().default(""),
  confidence: z.number().min(0).max(1).nullable().optional(),
  contradictingEvidence: z.string().trim().max(1400).optional().default(""),
  problemId: z.string().uuid(),
  proximateCause: z.string().trim().max(1000).optional().default(""),
  rootCauseHypothesis: z.string().trim().min(3).max(1200),
  supportingEvidence: z.string().trim().max(1400).optional().default(""),
  symptom: z.string().trim().min(3).max(1000),
  uncertainty: z.string().trim().max(1200).optional().default(""),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Diagnosis." }, { status: 400 });
    }
    const problem = await getProblem(context.workspace.id, parsed.data.problemId);
    if (!problem) {
      return Response.json({ error: "Problem was not found." }, { status: 404 });
    }
    const diagnosis = await createDiagnosis({
      alternativeHypotheses: parsed.data.alternativeHypotheses,
      confidence: parsed.data.confidence ?? null,
      contradictingEvidence: parsed.data.contradictingEvidence,
      evidenceIds: problem.evidenceIds,
      goalId: problem.goalId,
      problemId: problem.id,
      proximateCause: parsed.data.proximateCause,
      rootCauseHypothesis: parsed.data.rootCauseHypothesis,
      supportingEvidence: parsed.data.supportingEvidence,
      symptom: parsed.data.symptom,
      uncertainty: parsed.data.uncertainty,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ diagnosis: projectDiagnosis(diagnosis) }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not save the Diagnosis.");
  }
}
