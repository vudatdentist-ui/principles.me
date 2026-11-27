import { z } from "zod";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import { optionalSession } from "@/features/auth/session";
import { projectEvidenceForClient } from "@/features/evidence/client-reference";
import { sharedLibrary } from "@/features/evidence/providers/anythingllm-library";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  if (!(await optionalSession(request)))
    return json({ error: "unauthorized" }, 401);
  try {
    const library = sharedLibrary();
    if (!library) return json({ error: "disabled" }, 503);
    return json({ books: await library.books(request.signal) });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

const search = z.object({ query: z.string().trim().min(1).max(1000) }).strict();
export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
  } catch (error) {
    if (error instanceof UntrustedOriginError)
      return json({ error: "origin" }, 403);
    throw error;
  }
  const session = await optionalSession(request);
  if (!session) return json({ error: "unauthorized" }, 401);
  const parsed = search.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "query" }, 400);
  const quota = await consumeRateLimit({
    action: "library.search",
    scopeKey: workspaceRateScope(session.workspace.id),
    windowSeconds: 3600,
    limit: Number(process.env.ASK_RATE_LIMIT_PER_HOUR || 30),
  });
  if (!quota.allowed) return json({ error: "limit" }, 429);
  try {
    const library = sharedLibrary();
    if (!library) return json({ error: "disabled" }, 503);
    const hits = await library.search(parsed.data.query, request.signal);
    return json({ references: hits.map(projectEvidenceForClient) });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
