import { z } from "zod";
import {
  BootstrapConfigurationError,
  BootstrapSecretError,
} from "@/features/auth/bootstrap";
import { assertTrustedOrigin, UntrustedOriginError } from "@/features/auth/origin";
import { hashPassword } from "@/features/auth/password";
import {
  createAccount,
  createSession,
  EmailAlreadyExistsError,
  SignupClosedError,
} from "@/features/auth/repository";
import { sessionCookie } from "@/features/auth/session";
import { authRateScope, consumeRateLimit } from "@/features/security/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(256),
  setupKey: z.string().max(256).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid account details." }, { status: 400 });
    }

    const rate = await consumeRateLimit({
      action: "auth.signup",
      limit: Number(process.env.AUTH_ATTEMPTS_PER_15_MINUTES || 10),
      scopeKey: authRateScope(request),
      windowSeconds: 15 * 60,
    });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many attempts." },
        { headers: { "retry-after": String(rate.retryAfterSeconds) }, status: 429 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const account = await createAccount({
      email: parsed.data.email,
      passwordHash,
      setupKey: parsed.data.setupKey,
    });
    const token = await createSession(account.userId);

    return Response.json(
      { ok: true },
      { headers: { "set-cookie": sessionCookie(token) }, status: 201 }
    );
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    if (error instanceof BootstrapSecretError) {
      return Response.json({ error: "Invalid setup key." }, { status: 403 });
    }
    if (error instanceof BootstrapConfigurationError) {
      console.error(JSON.stringify({ event: "auth_bootstrap_not_configured" }));
      return Response.json({ error: "Account setup is unavailable." }, { status: 503 });
    }
    if (error instanceof SignupClosedError) {
      return Response.json({ error: "Account creation is closed." }, { status: 403 });
    }
    if (error instanceof EmailAlreadyExistsError) {
      return Response.json({ error: "Account already exists." }, { status: 409 });
    }
    console.error(JSON.stringify({ event: "auth_signup_failed" }));
    return Response.json({ error: "Account could not be created." }, { status: 500 });
  }
}
