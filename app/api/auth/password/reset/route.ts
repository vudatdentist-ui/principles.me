import { z } from "zod";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { hashPassword } from "@/features/auth/password";
import { resetPasswordWithToken } from "@/features/auth/repository";

const schema = z.object({
  password: z.string().min(12).max(256),
  token: z.string().min(20).max(200),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid password reset details." },
        { status: 400 },
      );
    }
    const changed = await resetPasswordWithToken(
      parsed.data.token,
      await hashPassword(parsed.data.password),
    );
    if (!changed) {
      return Response.json(
        { error: "This reset link is invalid or expired." },
        { status: 400 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    console.error(JSON.stringify({ event: "auth_password_reset_failed" }));
    return Response.json({ error: "Password reset failed." }, { status: 500 });
  }
}
