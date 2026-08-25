import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { assignOrganizationTeamMember } from "@/features/organization/repository";

const schema = z.object({
  email: z.string().trim().email().max(320),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  teamId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Team assignment is incomplete." }, { status: 400 });
    }
    return Response.json(
      await assignOrganizationTeamMember({
        email: parsed.data.email,
        handle: parsed.data.organizationHandle,
        teamId: parsed.data.teamId,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not assign team member.");
  }
}
