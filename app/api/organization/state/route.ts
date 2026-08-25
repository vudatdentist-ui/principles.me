import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { loadOrganizationState } from "@/features/organization/repository";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request);
    return Response.json(await loadOrganizationState(context.user.id));
  } catch (error) {
    return organizationApiError(error, "Could not load organizations.");
  }
}
