import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { createOrganization } from "@/features/organization/repository";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  purpose: z.string().trim().max(1200).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Organization details are incomplete." }, { status: 400 });
    }
    const state = await createOrganization({
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      userId: context.user.id,
    });
    return Response.json(state, { status: 201 });
  } catch (error) {
    return organizationApiError(error, "Could not create organization.");
  }
}
