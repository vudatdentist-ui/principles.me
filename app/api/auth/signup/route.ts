import { z } from "zod";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { hashPassword } from "@/features/auth/password";
import {
  createAccount,
  createEmailVerificationToken,
  createSession,
  EmailAlreadyExistsError,
  SignupClosedError,
} from "@/features/auth/repository";
import { sessionCookie } from "@/features/auth/session";
import {
  authRateScope,
  consumeRateLimit,
} from "@/features/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email/brevo";

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(256),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid account details." },
        { status: 400 },
      );
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
        {
          headers: { "retry-after": String(rate.retryAfterSeconds) },
          status: 429,
        },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const account = await createAccount({
      email: parsed.data.email,
      passwordHash,
    });
    const verificationRequired =
      process.env.NODE_ENV === "production" ||
      process.env.AUTH_EMAIL_VERIFICATION_MODE !== "optional";
    if (!verificationRequired) {
      const token = await createSession(account.userId);
      return Response.json(
        { ok: true },
        { headers: { "set-cookie": sessionCookie(token) }, status: 201 },
      );
    }

    const verificationToken = await createEmailVerificationToken(
      account.userId,
    );
    try {
      await sendVerificationEmail(parsed.data.email, verificationToken);
    } catch {
      console.error(
        JSON.stringify({ event: "auth_verification_email_failed" }),
      );
      return Response.json(
        {
          error:
            "Account created, but the verification email could not be sent. Try again shortly.",
        },
        { status: 503 },
      );
    }

    return Response.json(
      { ok: true, verificationRequired: true },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    if (error instanceof SignupClosedError) {
      return Response.json(
        { error: "Account creation is closed." },
        { status: 403 },
      );
    }
    if (error instanceof EmailAlreadyExistsError) {
      return Response.json(
        { error: "Account already exists." },
        { status: 409 },
      );
    }
    console.error(JSON.stringify({ event: "auth_signup_failed" }));
    return Response.json(
      { error: "Account could not be created." },
      { status: 500 },
    );
  }
}
