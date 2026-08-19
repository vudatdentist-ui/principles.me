import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleDecisionReview } from "@/lib/db/learning-loop-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const requestSchema = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("30_days") }),
  z.object({ preset: z.literal("90_days") }),
  z.object({
    customDate: z.string().trim().min(1),
    preset: z.literal("custom"),
  }),
  z.object({ preset: z.literal("none") }),
]);

type RouteContext = { params: Promise<{ id: string }> };

function resolveReviewAt(input: z.infer<typeof requestSchema>) {
  if (input.preset === "none") {
    return null;
  }
  if (input.preset === "custom") {
    const parsed = new Date(input.customDate);
    if (Number.isNaN(parsed.getTime())) {
      return "invalid" as const;
    }
    return parsed;
  }

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + (input.preset === "30_days" ? 30 : 90));
  return date;
}

export async function POST(request: Request, context: RouteContext) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review schedule." },
      { status: 400 }
    );
  }

  const reviewAt = resolveReviewAt(parsed.data);
  if (reviewAt === "invalid") {
    return NextResponse.json(
      { error: "Invalid custom review date." },
      { status: 400 }
    );
  }
  if (reviewAt && reviewAt <= new Date()) {
    return NextResponse.json(
      { error: "Review date must be in the future." },
      { status: 400 }
    );
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const updated = await scheduleDecisionReview({
    decisionId: id,
    reviewAt,
    userId: workspaceUser.id,
  });
  if (!updated) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ decision: updated });
}
