import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { addOrganizationMember } from "@/features/organization/repository";

const schema = z.object({
  email: z.string().trim().email().max(320),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Member details are incomplete." }, { status: 400 });
    }
    return Response.json(
      await addOrganizationMember({
        email: parsed.data.email,
        handle: parsed.data.organizationHandle,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not add organization member.");
  }
}
