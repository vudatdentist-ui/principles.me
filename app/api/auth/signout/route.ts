import { assertTrustedOrigin, UntrustedOriginError } from "@/features/auth/origin";
import { revokeSession } from "@/features/auth/repository";
import {
  clearedSessionCookie,
  sessionTokenFromCookieHeader,
} from "@/features/auth/session";

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedOrigin(request);
    const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
    if (token) {
      await revokeSession(token);
    }
    return Response.json(
      { ok: true },
      { headers: { "set-cookie": clearedSessionCookie() } }
    );
  } catch (error) {
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    console.error(JSON.stringify({ event: "auth_signout_failed" }));
    return Response.json({ error: "Sign out failed." }, { status: 500 });
  }
}
