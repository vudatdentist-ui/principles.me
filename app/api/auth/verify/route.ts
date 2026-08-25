import { z } from "zod";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { verifyEmailToken } from "@/features/auth/repository";

const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !(await verifyEmailToken(parsed.data.token))) {
      return Response.json(
        { error: "This verification link is invalid or expired." },
        { status: 400 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    console.error(JSON.stringify({ event: "auth_email_verification_failed" }));
    return Response.json(
      { error: "Email verification failed." },
      { status: 500 },
    );
  }
}
