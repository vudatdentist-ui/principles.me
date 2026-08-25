import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import {
  recordOrganizationIssue,
  resolveOrganizationIssue,
} from "@/features/organization/repository";

const createSchema = z.object({
  observedReality: z.string().trim().min(3).max(2400),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  tension: z.string().trim().min(3).max(2400),
  title: z.string().trim().min(2).max(180),
});

const resolveSchema = z.object({
  issueId: z.string().uuid(),
  organizationHandle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
  resolution: z.string().trim().min(3).max(2400),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Issue details are incomplete." }, { status: 400 });
    }
    return Response.json(
      await recordOrganizationIssue({
        handle: parsed.data.organizationHandle,
        observedReality: parsed.data.observedReality,
        tension: parsed.data.tension,
        title: parsed.data.title,
        userId: context.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return organizationApiError(error, "Could not record issue.");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = resolveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Issue resolution is incomplete." }, { status: 400 });
    }
    return Response.json(
      await resolveOrganizationIssue({
        handle: parsed.data.organizationHandle,
        issueId: parsed.data.issueId,
        resolution: parsed.data.resolution,
        userId: context.user.id,
      })
    );
  } catch (error) {
    return organizationApiError(error, "Could not resolve issue.");
  }
}
