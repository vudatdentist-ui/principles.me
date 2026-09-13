import { z } from "zod";
import {
  deleteAccountData,
  OwnedOrganizationsRequireConfirmationError,
} from "@/features/account/repository";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { verifyPassword } from "@/features/auth/password";
import { findUserForSignin } from "@/features/auth/repository";
import {
  clearedSessionCookie,
  requireSession,
  UnauthorizedError,
} from "@/features/auth/session";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";
import { errorFields, logEvent } from "@/lib/observability/logger";

const schema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  deleteOwnedOrganizations: z.boolean().default(false),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const session = await requireSession(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Type DELETE MY ACCOUNT to confirm deletion." },
        { status: 400 },
      );
    }
    const rate = await consumeRateLimit({
      action: "account.delete",
      limit: 3,
      scopeKey: workspaceRateScope(session.workspace.id),
      windowSeconds: 60 * 60,
    });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many deletion attempts." },
        {
          headers: { "retry-after": String(rate.retryAfterSeconds) },
          status: 429,
        },
      );
    }

    const user = await findUserForSignin(session.user.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return Response.json({ error: "Password confirmation failed." }, { status: 401 });
    }

    const result = await deleteAccountData({
      deleteOwnedOrganizations: parsed.data.deleteOwnedOrganizations,
      userId: session.user.id,
      workspaceId: session.workspace.id,
    });
    logEvent("info", "account.delete.completed", {
      deletedOwnedOrganizations: result.deletedOwnedOrganizations,
    });
    return Response.json(
      { ok: true, ...result },
      { headers: { "set-cookie": clearedSessionCookie() } },
    );
  } catch (error) {
    if (error instanceof OwnedOrganizationsRequireConfirmationError) {
      return Response.json(
        {
          code: "OWNED_ORGANIZATIONS_REQUIRE_CONFIRMATION",
          error: "Deleting this account can also delete organizations you own. Confirm that explicitly to continue.",
          organizations: error.organizations,
        },
        { status: 409 },
      );
    }
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    logEvent("error", "account.delete.failed", errorFields(error));
    return Response.json({ error: "Account deletion failed." }, { status: 500 });
  }
}
