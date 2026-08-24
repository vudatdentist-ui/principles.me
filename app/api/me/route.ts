import { optionalSession } from "@/features/auth/session";

export async function GET(request: Request): Promise<Response> {
  const session = await optionalSession(request);
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  return Response.json(
    { user: session.user, workspace: session.workspace },
    { headers: { "cache-control": "no-store" } }
  );
}
