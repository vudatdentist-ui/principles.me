import { z } from "zod";
import { assertTrustedOrigin, UntrustedOriginError } from "@/features/auth/origin";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { createSession, findUserForSignin } from "@/features/auth/repository";
import { sessionCookie } from "@/features/auth/session";
import { authRateScope, consumeRateLimit } from "@/features/security/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(256),
});

function invalidCredentials(): Response {
  return Response.json({ error: "Invalid email or password." }, { status: 401 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return invalidCredentials();
    }

    const rate = await consumeRateLimit({
      action: "auth.signin",
      limit: Number(process.env.AUTH_ATTEMPTS_PER_15_MINUTES || 10),
      scopeKey: authRateScope(request, parsed.data.email),
      windowSeconds: 15 * 60,
    });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many attempts." },
        { headers: { "retry-after": String(rate.retryAfterSeconds) }, status: 429 }
      );
    }

    const user = await findUserForSignin(parsed.data.email);
    if (!user) {
      // Spend a real scrypt operation so an unknown account does not take a cheap path.
      await hashPassword(parsed.data.password);
      return invalidCredentials();
    }

    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return invalidCredentials();
    }

    const token = await createSession(user.id);
    return Response.json(
      { ok: true },
      { headers: { "set-cookie": sessionCookie(token) } }
    );
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    console.error(JSON.stringify({ event: "auth_signin_failed" }));
    return Response.json({ error: "Sign in failed." }, { status: 500 });
  }
}
