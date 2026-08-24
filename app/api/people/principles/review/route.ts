import { z } from "zod";
import {
  peopleApiError,
  requirePeopleMutation,
} from "@/features/people/api";
import { projectPrinciple } from "@/features/people/projection";
import { reviewPrinciple } from "@/features/people/repository";

const schema = z
  .object({
    action: z.enum(["accept", "reject", "revise"]),
    principleId: z.string().uuid(),
    rationale: z.string().trim().max(1000).optional(),
    rule: z.string().trim().max(800).optional(),
    trigger: z.string().trim().max(800).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.action === "revise" &&
      (!value.trigger?.trim() || !value.rule?.trim())
    ) {
      context.addIssue({
        code: "custom",
        message: "Revised trigger and rule are required.",
      });
    }
  });

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Principle review." }, { status: 400 });
    }
    const principle = await reviewPrinciple({
      action: parsed.data.action,
      principleId: parsed.data.principleId,
      rationale: parsed.data.rationale,
      rule: parsed.data.rule,
      trigger: parsed.data.trigger,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ principle: projectPrinciple(principle) });
  } catch (error) {
    return peopleApiError(error, "Could not review Principle.");
  }
}
