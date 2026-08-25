import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import {
  raiseOrganizationDisagreement,
  resolveOrganizationDisagreement,
} from "@/features/organization/repository";

const createSchema = z.object({
  issueId: z.string().uuid(),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  reasoning: z.string().trim().max(2400).optional(),
  statement: z.string().trim().min(3).max(2400),
});

const resolveSchema = z.object({
  disagreementId: z.string().uuid(),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  resolution: z.string().trim().min(3).max(2400),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Disagreement details are incomplete." }, { status: 400 });
    }
    return Response.json(
      await raiseOrganizationDisagreement({
        handle: parsed.data.organizationHandle,
        issueId: parsed.data.issueId,
        reasoning: parsed.data.reasoning,
        statement: parsed.data.statement,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not record disagreement.");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = resolveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Disagreement resolution is incomplete." }, { status: 400 });
    }
    return Response.json(
      await resolveOrganizationDisagreement({
        disagreementId: parsed.data.disagreementId,
        handle: parsed.data.organizationHandle,
        resolution: parsed.data.resolution,
        userId: context.user.id,
      })
    );
  } catch (error) {
    return organizationApiError(error, "Could not resolve disagreement.");
  }
}
