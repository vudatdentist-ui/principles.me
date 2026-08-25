import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { recordOrganizationContextEvidence } from "@/features/organization/repository";

const schema = z.object({
  context: z.string().trim().min(2).max(600),
  email: z.string().trim().email().max(320),
  evidenceAgainst: z.string().trim().max(2400).optional(),
  evidenceFor: z.string().trim().max(2400).optional(),
  observation: z.string().trim().min(3).max(2400),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Context evidence is incomplete." }, { status: 400 });
    }
    if (!(parsed.data.evidenceFor || parsed.data.evidenceAgainst)) {
      return Response.json(
        { error: "Record evidence for, evidence against, or both." },
        { status: 400 }
      );
    }
    return Response.json(
      await recordOrganizationContextEvidence({
        context: parsed.data.context,
        email: parsed.data.email,
        evidenceAgainst: parsed.data.evidenceAgainst,
        evidenceFor: parsed.data.evidenceFor,
        handle: parsed.data.organizationHandle,
        observation: parsed.data.observation,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not record context evidence.");
  }
}
