import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import {
  projectAction,
  projectDesign,
} from "@/features/people/execution-projection";
import {
  createDesign,
  getDiagnosis,
} from "@/features/people/execution-repository";

const schema = z.object({
  actions: z.array(z.string().trim().min(3).max(500)).min(1).max(5),
  diagnosisId: z.string().uuid(),
  expectedResult: z.string().trim().min(3).max(1000),
  machineChange: z.string().trim().min(3).max(1200),
  rationale: z.string().trim().min(3).max(1400),
  successSignal: z.string().trim().min(3).max(1000),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Design." }, { status: 400 });
    }
    const diagnosis = await getDiagnosis(context.workspace.id, parsed.data.diagnosisId);
    if (!diagnosis) {
      return Response.json({ error: "Diagnosis was not found." }, { status: 404 });
    }
    const result = await createDesign({
      actions: parsed.data.actions,
      diagnosisId: diagnosis.id,
      expectedResult: parsed.data.expectedResult,
      goalId: diagnosis.goalId,
      machineChange: parsed.data.machineChange,
      problemId: diagnosis.problemId,
      rationale: parsed.data.rationale,
      successSignal: parsed.data.successSignal,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json(
      {
        actions: result.actions.map(projectAction),
        design: projectDesign(result.design),
      },
      { status: 201 }
    );
  } catch (error) {
    return peopleApiError(error, "Could not save the Design.");
  }
}
