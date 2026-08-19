import { z } from "zod";
import { briefToText } from "@/lib/council/grounding";
import { buildCouncilPlan } from "@/lib/council/lenses";
import { retrieveCouncilEvidence } from "@/lib/council/retrieval";
import { synthesizeCouncilBrief } from "@/lib/council/synthesize";
import { getPersonalContext } from "@/lib/db/personal-brain-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

export const maxDuration = 60;

const requestSchema = z.object({
  context: z.string().trim().max(12_000).default(""),
  question: z.string().trim().min(3).max(4000),
  thinkerIds: z.array(z.string()).max(12).default([]),
});

function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Decision không hợp lệ." }, { status: 400 });
  }
  const { context, question, thinkerIds } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(line(event)));
      try {
        write({
          message: "Đang retrieve personal principles và similar decisions…",
          stage: "PERSONAL_MEMORY",
          type: "status",
        });
        const workspaceUser = await getWorkspaceUser();
        const personalContext = await getPersonalContext({
          context,
          question,
          userId: workspaceUser.id,
        });
        write({
          contradictionCount: personalContext.contradictions.length,
          personalPrincipleCount: personalContext.principles.length,
          similarDecisionCount: personalContext.similarDecisions.length,
          type: "personal_context",
        });

        write({
          message: "Đang phân tích decision thành các reasoning lenses…",
          stage: "CLASSIFYING",
          type: "status",
        });
        const plan = buildCouncilPlan({ context, question, thinkerIds });
        write({ plan, type: "plan" });

        write({
          message: `Đang retrieval external evidence theo ${plan.lenses.length} lenses và ${plan.members.length} Council members…`,
          stage: "RETRIEVING",
          type: "status",
        });
        const retrieval = await retrieveCouncilEvidence(plan);
        write({
          configured: retrieval.configured,
          provider: "RAGFlow",
          queryCount: retrieval.queryCount,
          reason: retrieval.reason,
          resultCount: retrieval.references.length,
          successfulQueryCount: retrieval.successfulQueryCount,
          type: "retrieval",
        });
        write({ references: retrieval.references, type: "references" });

        if (!retrieval.references.length) {
          const caveat =
            retrieval.reason === "NOT_CONFIGURED"
              ? "RAGFlow chưa được cấu hình dataset/API key."
              : retrieval.reason === "UNAVAILABLE"
                ? "Các retrieval query đều không hoàn thành."
                : "RAGFlow không trả về chunk phù hợp cho các decision lenses.";
          write({
            message:
              "Không có external evidence đủ liên quan; personal memory không được dùng để giả thành sourced recommendation.",
            stage: "NO_EVIDENCE",
            type: "status",
          });
          write({
            answer:
              "Chưa có external evidence đủ liên quan từ RAGFlow để tạo một Council brief có căn cứ.",
            brief: null,
            caveats: [caveat],
            citations: [],
            grounded: false,
            plan,
            type: "answer",
          });
          write({ type: "done" });
          return;
        }

        write({
          message:
            "External evidence đã khóa. DeepSeek đang reasoning với provenance tách riêng khỏi personal memory…",
          stage: "SYNTHESIZING",
          type: "status",
        });
        const result = await synthesizeCouncilBrief({
          context,
          personalContext,
          plan,
          question,
          references: retrieval.references,
        });
        const answer = briefToText(result.brief);
        write({
          answer,
          brief: result.brief,
          caveats: result.grounded
            ? []
            : [
                "DeepSeek không tạo được claim có citation hợp lệ; unsupported claims đã bị loại.",
              ],
          citations: result.citations,
          grounded: result.grounded,
          plan,
          type: "answer",
        });
        write({ type: "done" });
      } catch (error) {
        write({
          message:
            error instanceof Error ? error.message : "Council pipeline failed.",
          type: "error",
        });
        write({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}
