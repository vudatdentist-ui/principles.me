import { NextResponse } from "next/server";
import { z } from "zod";
import { logAppError } from "@/lib/observability/app-error";

const payloadSchema = z.object({
  code: z.string().trim().min(1).max(80),
  route: z.string().trim().min(1).max(300),
});

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  logAppError({
    code: parsed.data.code,
    kind: "client",
    route: parsed.data.route,
    stage: "fatal_render",
  });
  return NextResponse.json({ ok: true });
}
