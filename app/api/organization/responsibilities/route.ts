import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { createOrganizationResponsibility } from "@/features/organization/repository";

const schema = z.object({
  expectedOutcome: z.string().trim().max(1200).optional(),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  roleId: z.string().uuid(),
  statement: z.string().trim().min(3).max(1200),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Responsibility details are incomplete." }, { status: 400 });
    }
    return Response.json(
      await createOrganizationResponsibility({
        expectedOutcome: parsed.data.expectedOutcome,
        handle: parsed.data.organizationHandle,
        roleId: parsed.data.roleId,
        statement: parsed.data.statement,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not create responsibility.");
  }
}
