import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { createOrganizationTeam } from "@/features/organization/repository";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  purpose: z.string().trim().max(1200).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Team details are incomplete." }, { status: 400 });
    }
    return Response.json(
      await createOrganizationTeam({
        handle: parsed.data.organizationHandle,
        name: parsed.data.name,
        purpose: parsed.data.purpose,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not create team.");
  }
}
