import { z } from "zod";
import { exportAccountData } from "@/features/account/repository";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { verifyPassword } from "@/features/auth/password";
import { findUserForSignin } from "@/features/auth/repository";
import { requireSession, UnauthorizedError } from "@/features/auth/session";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";
import { errorFields, logEvent } from "@/lib/observability/logger";

const schema = z.object({
  password: z.string().min(1).max(256),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const session = await requireSession(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const rate = await consumeRateLimit({
      action: "account.export",
      limit: 5,
      scopeKey: workspaceRateScope(session.workspace.id),
      windowSeconds: 60 * 60,
    });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many export attempts." },
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

    const data = await exportAccountData({
      userId: session.user.id,
      workspaceId: session.workspace.id,
    });
    const date = new Date().toISOString().slice(0, 10);
    logEvent("info", "account.export.completed");
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="principles-export-${date}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    logEvent("error", "account.export.failed", errorFields(error));
    return Response.json({ error: "Account export failed." }, { status: 500 });
  }
}
