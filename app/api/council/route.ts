import { z } from "zod";
import { briefToText } from "@/lib/council/grounding";
import { buildCouncilPlan } from "@/lib/council/lenses";
import { retrieveCouncilEvidence } from "@/lib/council/retrieval";
import { countPromptInjectionSignals } from "@/lib/council/security";
import { synthesizeCouncilBrief } from "@/lib/council/synthesize";
import { getPersonalContext } from "@/lib/db/personal-brain-queries";
import {
  buildCouncilTelemetry,
  logCouncilTelemetry,
  summarizeRetrievalScores,
} from "@/lib/observability/council-telemetry";
import { getWorkspaceUser } from "@/lib/workspace-user";

export const maxDuration = 60;

const requestSchema = z.object({
  context: z.string().trim().max(12_000).default(""),
  decisionId: z.string().uuid().optional(),
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
  const { context, decisionId = null, question, thinkerIds } = parsed.data;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(line(event)));
      let citationCount = 0;
      let errorStage: string | null = null;
      let grounded = false;
      let modelLatencyMs = 0;
      let promptInjectionFlagCount = 0;
      let retrievalLatencyMs = 0;
      let retrievalQueryCount = 0;
      let retrievalScoreAvg: number | null = null;
      let retrievalScoreMax: number | null = null;
      let retrievalScoreMin: number | null = null;
      let retrievedChunks = 0;
      let successfulRetrievalQueryCount = 0;
      let telemetryLogged = false;

      const emitTelemetry = (errorCode: string | null = null) => {
        if (telemetryLogged) {
          return;
        }
        telemetryLogged = true;
        logCouncilTelemetry(
          buildCouncilTelemetry({
            citationCount,
            decisionId,
            errorCode,
            errorStage: errorCode ? errorStage : null,
            grounded,
            model,
            modelLatencyMs,
            promptInjectionFlagCount,
            retrievalLatencyMs,
            retrievalQueryCount,
            retrievalScoreAvg,
            retrievalScoreMax,
            retrievalScoreMin,
            retrievedChunks,
            successfulRetrievalQueryCount,
          })
        );
      };

      try {
        errorStage = "PERSONAL_MEMORY";
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

        errorStage = "CLASSIFYING";
        write({
          message: "Đang phân tích decision thành các reasoning lenses…",
          stage: "CLASSIFYING",
          type: "status",
        });
        const plan = buildCouncilPlan({ context, question, thinkerIds });
        write({ plan, type: "plan" });

        errorStage = "RETRIEVING";
        write({
          message: `Đang retrieval external evidence theo ${plan.lenses.length} lenses và ${plan.members.length} Council members…`,
          stage: "RETRIEVING",
          type: "status",
        });
        const retrievalStartedAt = performance.now();
        const retrieval = await retrieveCouncilEvidence(plan);
        retrievalLatencyMs = Math.round(performance.now() - retrievalStartedAt);
        retrievalQueryCount = retrieval.queryCount;
        successfulRetrievalQueryCount = retrieval.successfulQueryCount;
        retrievedChunks = retrieval.references.length;
        const scoreSummary = summarizeRetrievalScores(
          retrieval.references.map((reference) => reference.score)
        );
        retrievalScoreAvg = scoreSummary.avg;
        retrievalScoreMax = scoreSummary.max;
        retrievalScoreMin = scoreSummary.min;
        promptInjectionFlagCount = countPromptInjectionSignals(
          retrieval.references.map((reference) => reference.text)
        );
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
          errorStage = null;
          emitTelemetry();
          write({ type: "done" });
          return;
        }

        errorStage = "SYNTHESIZING";
        write({
          message:
            "External evidence đã khóa. DeepSeek đang reasoning với provenance tách riêng khỏi personal memory…",
          stage: "SYNTHESIZING",
          type: "status",
        });
        const modelStartedAt = performance.now();
        const result = await synthesizeCouncilBrief({
          context,
          personalContext,
          plan,
          question,
          references: retrieval.references,
        });
        modelLatencyMs = Math.round(performance.now() - modelStartedAt);
        citationCount = result.citations.length;
        grounded = result.grounded;
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
        errorStage = null;
        emitTelemetry();
        write({ type: "done" });
      } catch (error) {
        emitTelemetry(error instanceof Error ? error.name : "UNKNOWN_ERROR");
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
