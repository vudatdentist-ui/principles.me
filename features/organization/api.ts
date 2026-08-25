import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import {
  requireSession,
  UnauthorizedError,
} from "@/features/auth/session";
import type { SessionContext } from "@/features/auth/contracts";
import {
  OrganizationConflictError,
  OrganizationForbiddenError,
  OrganizationMemberNotFoundError,
  OrganizationNotFoundError,
} from "./repository";

export async function requireOrganizationSession(
  request: Request,
  mutation = false
): Promise<SessionContext> {
  if (mutation) {
    assertTrustedOrigin(request);
  }
  return requireSession(request);
}

export function organizationApiError(
  error: unknown,
  fallback = "Organization request failed."
): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (error instanceof UntrustedOriginError) {
    return Response.json({ error: "Request rejected." }, { status: 403 });
  }
  if (error instanceof OrganizationForbiddenError) {
    return Response.json({ error: "Owner permission required." }, { status: 403 });
  }
  if (error instanceof OrganizationMemberNotFoundError) {
    return Response.json({ error: "Organization member not found." }, { status: 404 });
  }
  if (error instanceof OrganizationNotFoundError) {
    return Response.json({ error: "Organization record not found." }, { status: 404 });
  }
  if (error instanceof OrganizationConflictError) {
    return Response.json({ error: "That organization record already exists." }, { status: 409 });
  }
  console.error(JSON.stringify({ event: "organization_api_failed" }));
  return Response.json({ error: fallback }, { status: 500 });
}
