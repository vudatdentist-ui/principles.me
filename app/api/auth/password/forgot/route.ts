import { z } from "zod";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { createPasswordResetTokenForEmail } from "@/features/auth/repository";
import {
  authRateScope,
  consumeRateLimit,
} from "@/features/security/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email/brevo";

const schema = z.object({ email: z.string().trim().email().max(320) });

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }
    const rate = await consumeRateLimit({
      action: "auth.password_forgot",
      limit: Number(process.env.AUTH_ATTEMPTS_PER_15_MINUTES || 10),
      scopeKey: authRateScope(request),
      windowSeconds: 15 * 60,
    });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many attempts." },
        {
          headers: { "retry-after": String(rate.retryAfterSeconds) },
          status: 429,
        },
      );
    }

    const reset = await createPasswordResetTokenForEmail(parsed.data.email);
    if (reset) {
      try {
        await sendPasswordResetEmail(reset.email, reset.token);
      } catch {
        console.error(
          JSON.stringify({ event: "auth_password_reset_email_failed" }),
        );
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    console.error(JSON.stringify({ event: "auth_password_forgot_failed" }));
    return Response.json(
      { error: "Password reset could not be started." },
      { status: 500 },
    );
  }
}
