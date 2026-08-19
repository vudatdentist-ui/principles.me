import { NextResponse } from "next/server";
import { z } from "zod";

const runSchema = z.object({
  mode: z.literal("run"),
  input: z.string().trim().min(3).max(5000),
});

const continueSchema = z.object({
  mode: z.literal("continue"),
  runId: z.string().min(1),
  input: z.string().trim().min(3).max(5000),
  answers: z.record(z.string(), z.string()).default({}),
});

function needsClarification(input: string) {
  const normalized = input.toLowerCase();
  const decisionWords = ["should i", "should we", "có nên", "nên ", "hire", "choose", "chọn", "quyết định"];
  const hasDecisionIntent = decisionWords.some((word) => normalized.includes(word));
  const hasConstraint = /because|because of|currently|hiện tại|constraint|limiting|mục tiêu|goal|runway|deadline|budget|team|revenue|customer/.test(normalized);
  return hasDecisionIntent && !hasConstraint && input.length < 180;
}

function buildComplete(input: string, answers: Record<string, string>, runId: string) {
  const answerText = Object.values(answers).filter(Boolean).join(" ");
  const context = answerText ? `${input}\n\nAdditional context: ${answerText}` : input;

  return {
    type: "complete" as const,
    runId,
    result: {
      framing: input,
      crux: answerText
        ? `The decision turns on the constraint you identified: ${answerText}.`
        : "Separate the reversible part of the choice from the part that creates lasting cost or lock-in.",
      evidence: [
        "Use the facts already present in the question before adding assumptions.",
        "Prefer a small reversible test when the uncertainty is high and the downside is containable.",
      ],
      conflicts: [
        "Moving now may create speed, but it can also create commitment before the key uncertainty is resolved.",
      ],
      read: `Based on the available context, choose the next action that reduces the most important uncertainty without creating unnecessary lock-in. For this question, that means defining the decision criterion first, then taking the smallest action that produces evidence against it.`,
      confidence: answerText ? "medium" : "low",
      wouldChange: "A hard deadline, an irreversible dependency, or evidence that the current bottleneck is different from the one assumed here.",
      sources: [
        {
          id: "session-context",
          title: "Thinking session context",
          detail: context,
        },
      ],
    },
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const run = runSchema.safeParse(body);
  if (run.success) {
    const runId = crypto.randomUUID();
    if (needsClarification(run.data.input)) {
      return NextResponse.json({
        type: "clarify",
        runId,
        canContinue: true,
        questions: [
          {
            id: "constraint",
            prompt: "What is currently limiting you more?",
            options: [
              "Execution",
              "Hiring / management",
              "Product direction",
              "Time / capital",
            ],
          },
        ],
      });
    }
    return NextResponse.json(buildComplete(run.data.input, {}, runId));
  }

  const continued = continueSchema.safeParse(body);
  if (continued.success) {
    return NextResponse.json(
      buildComplete(
        continued.data.input,
        continued.data.answers,
        continued.data.runId
      )
    );
  }

  return NextResponse.json({ error: "Ask input is invalid." }, { status: 400 });
}
