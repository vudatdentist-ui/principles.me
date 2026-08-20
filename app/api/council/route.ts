import { z } from "zod";
import {
  type EvidenceAudit,
  type EvidenceReference,
  formatEvidence,
  parseEvidenceAudit,
  sanitizeAnswer,
} from "@/lib/evidence-contract";
import {
  isFreshnessSensitive,
  modeDescription,
  modeLabel,
  selectModules,
  type ThinkerMachineModule,
} from "@/lib/thinker-machine";

export const maxDuration = 120;

const requestSchema = z.object({
  mode: z.enum(["adaptive", "high", "max"]).default("adaptive"),
  question: z.string().trim().min(3).max(4000),
  userContext: z.string().trim().max(6000).default(""),
  webResearch: z.boolean().default(false),
});

type ChatMessage = {
  content: string;
  role: "system" | "user";
};

type RetrievedReference = EvidenceReference;

type ModuleResult = {
  contextId: string;
  contextType: "evidence" | "independent";
  durationMs: number;
  error?: string;
  grounded: boolean;
  id: string;
  label: string;
  output: string;
};

function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

function apiBaseUrl(): string {
  const configured = (
    process.env.RAGFLOW_BASE_URL || "http://localhost:9380"
  ).replace(/\/+$/, "");
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

function deepSeekBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/+$/,
    ""
  );
}

function numeric(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(value);
}

function normalizeChunk(
  chunk: Record<string, unknown>,
  index: number
): RetrievedReference | null {
  const text = String(
    chunk.content ??
      chunk.content_with_weight ??
      chunk.highlight ??
      chunk.text ??
      ""
  ).trim();
  if (!text) {
    return null;
  }
  const documentId =
    String(chunk.document_id ?? chunk.doc_id ?? "").trim() || null;
  return {
    chunkId: String(chunk.id ?? chunk.chunk_id ?? "").trim() || null,
    datasetId: String(chunk.dataset_id ?? "").trim() || null,
    documentId,
    key: `R${index + 1}`,
    positions: Array.isArray(chunk.positions)
      ? chunk.positions.slice(0, 20)
      : [],
    score: numeric(chunk.similarity),
    sourceType: "ragflow",
    text: text.slice(0, 9000),
    title: String(
      chunk.document_name ??
        chunk.docnm_kwd ??
        chunk.document ??
        (documentId
          ? `Document ${documentId.slice(0, 12)}`
          : "Untitled RAGFlow chunk")
    ).trim(),
  };
}

async function retrieve(question: string): Promise<{
  configured: boolean;
  reason: string;
  references: RetrievedReference[];
}> {
  const apiKey = process.env.RAGFLOW_API_KEY?.trim();
  const datasetIds = (process.env.RAGFLOW_DATASET_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!apiKey || !datasetIds.length) {
    return { configured: false, reason: "NOT_CONFIGURED", references: [] };
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/retrieval`, {
      body: JSON.stringify({
        dataset_ids: datasetIds,
        document_ids: [],
        highlight: false,
        keyword: booleanEnv("RAGFLOW_KEYWORD_SEARCH", true),
        page: 1,
        page_size: Number(process.env.RAGFLOW_TOP_K || 10),
        question,
        similarity_threshold: Number(
          process.env.RAGFLOW_SIMILARITY_THRESHOLD || 0.2
        ),
        top_k: Number(process.env.RAGFLOW_TOP_K || 10),
        vector_similarity_weight: Number(
          process.env.RAGFLOW_VECTOR_SIMILARITY_WEIGHT || 0.3
        ),
      }),
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(
        Number(process.env.RAGFLOW_TIMEOUT_MS || 10_000)
      ),
    });
    const payload = await response.json().catch(() => ({}));
    if (
      !response.ok ||
      (payload.code !== undefined && Number(payload.code) !== 0)
    ) {
      return {
        configured: true,
        reason: String(
          payload.message ?? payload.msg ?? `HTTP_${response.status}`
        ).slice(0, 240),
        references: [],
      };
    }
    const chunks = Array.isArray(payload?.data?.chunks)
      ? payload.data.chunks
      : Array.isArray(payload?.chunks)
        ? payload.chunks
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    const references = chunks
      .map((chunk: unknown, index: number) =>
        normalizeChunk((chunk ?? {}) as Record<string, unknown>, index)
      )
      .filter(
        (
          reference: RetrievedReference | null
        ): reference is RetrievedReference => Boolean(reference)
      );
    return {
      configured: true,
      reason: references.length ? "RAGFLOW_RETRIEVED" : "NO_MATCHES",
      references,
    };
  } catch (error) {
    return {
      configured: true,
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "TIMEOUT"
          : "UNAVAILABLE",
      references: [],
    };
  }
}

async function researchWeb(question: string): Promise<{
  configured: boolean;
  reason: string;
  references: RetrievedReference[];
}> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return { configured: false, reason: "WEB_NOT_CONFIGURED", references: [] };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      body: JSON.stringify({
        api_key: apiKey,
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        query: question,
        search_depth: "basic",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(
        Number(process.env.WEB_RESEARCH_TIMEOUT_MS || 12_000)
      ),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload?.results)) {
      return {
        configured: true,
        reason: `WEB_HTTP_${response.status}`,
        references: [],
      };
    }
    const references = payload.results
      .map((result: unknown, index: number) => {
        const item = (result ?? {}) as Record<string, unknown>;
        const text = String(item.content ?? "").trim();
        if (!text) {
          return null;
        }
        return {
          chunkId: null,
          datasetId: null,
          documentId: null,
          key: `W${index + 1}`,
          positions: [],
          publishedAt: String(item.published_date ?? "").trim() || null,
          score: numeric(item.score),
          sourceType: "web" as const,
          text: text.slice(0, 7000),
          title: String(item.title ?? "Web source").trim(),
          url: String(item.url ?? "").trim() || null,
        } satisfies RetrievedReference;
      })
      .filter(
        (
          reference: RetrievedReference | null
        ): reference is RetrievedReference => Boolean(reference)
      );
    return {
      configured: true,
      reason: references.length ? "WEB_RETRIEVED" : "WEB_NO_MATCHES",
      references,
    };
  } catch (error) {
    return {
      configured: true,
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "WEB_TIMEOUT"
          : "WEB_UNAVAILABLE",
      references: [],
    };
  }
}

async function deepSeek(messages: ChatMessage[], temperature = 0.25) {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("Thiếu DEEPSEEK_API_KEY.");
  }
  const response = await fetch(`${deepSeekBaseUrl()}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 1800),
      messages,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      stream: false,
      temperature,
    }),
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(
      Number(process.env.DEEPSEEK_TIMEOUT_MS || 45_000)
    ),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`DeepSeek trả về HTTP ${response.status}.`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("DeepSeek trả về nội dung rỗng.");
  }
  return content.trim();
}

function moduleMessages(
  module: ThinkerMachineModule,
  question: string,
  userContext: string,
  references: RetrievedReference[]
): ChatMessage[] {
  const hasEvidenceContext = module.id === "evidence";
  return [
    {
      content: `${module.instruction} This is an isolated context window. You cannot see the output of any other module. Do not claim to speak for a historical thinker or person.`,
      role: "system",
    },
    {
      content: [
        `QUESTION:\n${question}`,
        userContext
          ? `PRINCIPLES ME CONTEXT:\n${userContext}`
          : "PRINCIPLES ME CONTEXT: none supplied",
        hasEvidenceContext
          ? `EVIDENCE PACKET (the only source authority):\n${formatEvidence(references)}`
          : "EVIDENCE PACKET: intentionally withheld from this independent reasoning pass.",
        "Return a concise analysis for the final synthesis machine. Mark uncertainty plainly.",
      ].join("\n\n"),
      role: "user",
    },
  ];
}

async function runModule(
  module: ThinkerMachineModule,
  question: string,
  userContext: string,
  references: RetrievedReference[]
): Promise<ModuleResult> {
  const startedAt = Date.now();
  const contextId = `ctx_${module.id}_${crypto.randomUUID()}`;
  try {
    const output = await deepSeek(
      moduleMessages(module, question, userContext, references),
      module.id === "evidence" ? 0.15 : 0.45
    );
    return {
      contextId,
      contextType: module.id === "evidence" ? "evidence" : "independent",
      durationMs: Date.now() - startedAt,
      grounded: module.id === "evidence" && references.length > 0,
      id: module.id,
      label: module.label,
      output,
    };
  } catch (error) {
    return {
      contextId,
      contextType: module.id === "evidence" ? "evidence" : "independent",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Module failed.",
      grounded: false,
      id: module.id,
      label: module.label,
      output: "",
    };
  }
}

function modulePacket(results: ModuleResult[]): string {
  return results
    .map(
      (result) =>
        `MODULE ${result.label} · ${result.contextType} · ${result.contextId}\n${result.output || result.error || "No output."}`
    )
    .join("\n\n");
}

function synthesisMessages(
  question: string,
  userContext: string,
  references: RetrievedReference[],
  results: ModuleResult[],
  critic = "",
  audit?: EvidenceAudit
): ChatMessage[] {
  const evidence = formatEvidence(references);
  const criticBlock = critic ? `\n\nCRITIC REVIEW:\n${critic}` : "";
  const auditBlock = audit
    ? `\n\nEVIDENCE AUDIT (binding quality gate):\n${JSON.stringify(audit, null, 2)}`
    : "\n\nEVIDENCE AUDIT: not run yet. Treat all unsupported factual claims as unknown.";
  return [
    {
      content:
        "You are the Synthesis Judge inside Principles Thinker. Combine isolated module outputs into one useful answer, but treat evidence quality as a hard constraint. Evidence from RAGFlow or explicitly enabled web research is the only source authority for factual claims. Every source-backed claim must cite the exact key like [R1] or [W1], and the cited excerpt must actually support that claim. Never use a source merely because it is topically adjacent. Never invent citations, page numbers, quotes, or bibliographic details. Clearly label model inference, hypotheses, assumptions, and user-specific recommendations. If evidence is absent, tangential, or contradicted, say that plainly before offering uncited reasoning. Do not mention agents as personalities.",
      role: "system",
    },
    {
      content: [
        `QUESTION:\n${question}`,
        userContext
          ? `PRINCIPLES ME CONTEXT:\n${userContext}`
          : "PRINCIPLES ME CONTEXT: none supplied",
        `RAW EVIDENCE:\n${evidence}`,
        `ISOLATED MODULE OUTPUTS:\n${modulePacket(results)}`,
        auditBlock,
        criticBlock,
        "Use this structure when useful: conclusion; evidence-backed observations with citations; reasoning or hypotheses explicitly marked as such; unknowns or conflicts; one practical next step. Do not turn a generic textbook explanation into an evidence-backed observation.",
      ].join("\n\n"),
      role: "user",
    },
  ];
}

async function auditDraft(
  question: string,
  references: RetrievedReference[],
  results: ModuleResult[],
  draft: string
): Promise<EvidenceAudit> {
  const allowedKeys = new Set(references.map((reference) => reference.key));
  try {
    const raw = await deepSeek(
      [
        {
          content:
            "You are the Evidence Judge. Audit a draft claim by claim against the supplied evidence packet. The packet is the only source authority. Do not use general model knowledge. A claim is supported only when the cited excerpt entails it; topical similarity is not enough. Mark absent, overgeneralized, or extrapolated facts unsupported. Mark a claim contradicted when the packet says the opposite. Return JSON only with this exact shape: { verdict: grounded|mixed|ungrounded, claims: [{ claim, status: supported|partially_supported|unsupported|contradicted, citations: [exact allowed keys], reason }], missingEvidence: [string], corrections: [string] }. Do not invent citation keys.",
          role: "system",
        },
        {
          content: [
            `QUESTION:\n${question}`,
            `EVIDENCE PACKET:\n${formatEvidence(references)}`,
            `DRAFT TO AUDIT:\n${draft}`,
            `INDEPENDENT ANALYSES (not source authority):\n${modulePacket(results)}`,
            `ALLOWED CITATION KEYS: ${[...allowedKeys].join(", ") || "none"}`,
          ].join("\n\n"),
          role: "user",
        },
      ],
      0.05
    );
    return parseEvidenceAudit(raw, allowedKeys);
  } catch {
    return parseEvidenceAudit("", allowedKeys);
  }
}

async function streamSynthesis(
  messages: ChatMessage[],
  references: RetrievedReference[],
  audit: EvidenceAudit,
  write: (event: Record<string, unknown>) => void
) {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("Thiếu DEEPSEEK_API_KEY.");
  }
  const response = await fetch(`${deepSeekBaseUrl()}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 2200),
      messages,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      stream: true,
      temperature: 0.2,
    }),
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(
      Number(process.env.DEEPSEEK_SYNTHESIS_TIMEOUT_MS || 55_000)
    ),
  });
  if (!response.ok) {
    throw new Error(`DeepSeek trả về HTTP ${response.status}.`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("DeepSeek không trả streaming body.");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    // biome-ignore lint/performance/noAwaitInLoops: Streaming requires sequential reads from the provider body.
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const rows = buffer.split("\n");
    buffer = rows.pop() || "";
    for (const row of rows) {
      const trimmed = row.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }
      try {
        const token = String(
          JSON.parse(data)?.choices?.[0]?.delta?.content || ""
        );
        if (token) {
          output += token;
          write({ token, type: "token" });
        }
      } catch {
        // The provider can split an SSE payload across packets.
      }
    }
  }
  return sanitizeAnswer(output, references, audit);
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Question không hợp lệ." }, { status: 400 });
  }
  const { mode, question, userContext, webResearch } = parsed.data;
  const selectedModules = selectModules(question, mode);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(line(event)));
      try {
        write({
          description: modeDescription(mode),
          mode,
          modeLabel: modeLabel(mode),
          moduleCount: selectedModules.length,
          modules: selectedModules.map((module) => ({
            id: module.id,
            label: module.label,
          })),
          type: "machine",
          webResearchRequested: webResearch,
        });
        write({
          message: "Thinker Machine đang lấy evidence từ RAGFlow…",
          stage: "RETRIEVING",
          type: "status",
        });
        const retrieval = await retrieve(question);
        const {
          configured: retrievalConfigured,
          reason: retrievalReason,
          references: retrievedReferences,
        } = retrieval;
        let references = retrievedReferences;
        write({
          configured: retrievalConfigured,
          provider: "RAGFlow",
          reason: retrievalReason,
          resultCount: references.length,
          type: "retrieval",
        });

        const shouldResearchWeb =
          webResearch &&
          (references.length === 0 || isFreshnessSensitive(question));
        if (shouldResearchWeb) {
          write({
            message: "Web Researcher đang tìm nguồn bổ sung có kiểm soát…",
            stage: "WEB_RESEARCH",
            type: "status",
          });
          const web = await researchWeb(question);
          references = [...references, ...web.references];
          write({
            configured: web.configured,
            provider: "Web Researcher",
            reason: web.reason,
            resultCount: web.references.length,
            type: "web_retrieval",
          });
        } else if (webResearch) {
          write({
            message:
              "RAGFlow đã có evidence; web research không được gọi cho câu hỏi này.",
            stage: "WEB_SKIPPED",
            type: "status",
          });
        }
        write({ references, type: "references" });

        write({
          message: `${selectedModules.length} context độc lập đang reasoning song song…`,
          stage: "REASONING",
          type: "status",
        });
        const modulePromises = selectedModules.map(async (module) => {
          const contextId = `ctx_${module.id}_${crypto.randomUUID()}`;
          write({
            contextId,
            contextType: module.id === "evidence" ? "evidence" : "independent",
            id: module.id,
            label: module.label,
            stage: "RUNNING",
            type: "module",
          });
          const result = await runModule(
            module,
            question,
            userContext,
            references
          );
          write({
            contextId: result.contextId || contextId,
            contextType: result.contextType,
            durationMs: result.durationMs,
            grounded: result.grounded,
            id: result.id,
            label: result.label,
            output: result.output.slice(0, 1000),
            stage: result.error ? "ERROR" : "COMPLETE",
            type: "module",
          });
          return result;
        });
        const moduleResults = await Promise.all(modulePromises);
        const successfulResults = moduleResults.filter(
          (moduleResult) => moduleResult.output
        );
        write({
          message: "Các context đã tách. Synthesis Judge đang đối chiếu…",
          stage: "SYNTHESIS",
          type: "status",
        });

        const draft = await deepSeek(
          synthesisMessages(
            question,
            userContext,
            references,
            successfulResults
          ),
          0.2
        );
        write({
          message:
            mode === "max"
              ? "Max mode: Evidence Judge đang kiểm tra từng claim và mâu thuẫn…"
              : "Evidence Judge đang kiểm tra từng claim trước khi trả lời…",
          stage: "AUDIT",
          type: "status",
        });
        const audit = await auditDraft(
          question,
          references,
          successfulResults,
          draft
        );
        write({
          claims: audit.claims.slice(0, 20),
          corrections: audit.corrections.slice(0, 8),
          missingEvidence: audit.missingEvidence.slice(0, 8),
          type: "audit",
          verdict: audit.verdict,
        });
        const critic =
          mode === "max"
            ? [
                "Max mode quality gate:",
                `Verdict: ${audit.verdict}`,
                audit.corrections.length
                  ? `Corrections: ${audit.corrections.join("; ")}`
                  : "No correction was returned.",
                audit.missingEvidence.length
                  ? `Missing evidence: ${audit.missingEvidence.join("; ")}`
                  : "No missing-evidence note was returned.",
              ].join("\n")
            : "";
        write({
          message: "DeepSeek đang stream câu trả lời cuối của Thinker Machine…",
          stage: "STREAMING",
          type: "status",
        });
        const streamedResult = await streamSynthesis(
          synthesisMessages(
            question,
            userContext,
            references,
            successfulResults,
            critic,
            audit
          ),
          references,
          audit,
          write
        );
        write({
          message: "Evidence Judge đang xác nhận lại câu trả lời đã stream…",
          stage: "FINAL_AUDIT",
          type: "status",
        });
        const finalAudit = await auditDraft(
          question,
          references,
          successfulResults,
          streamedResult.answer
        );
        write({
          claims: finalAudit.claims.slice(0, 20),
          corrections: finalAudit.corrections.slice(0, 8),
          final: true,
          missingEvidence: finalAudit.missingEvidence.slice(0, 8),
          type: "audit",
          verdict: finalAudit.verdict,
        });
        const result = sanitizeAnswer(
          streamedResult.answer,
          references,
          finalAudit
        );
        write({
          answer: result.answer,
          audit: {
            claimCount: finalAudit.claims.length,
            unsupportedCount: finalAudit.claims.filter((claim) =>
              ["partially_supported", "unsupported", "contradicted"].includes(
                claim.status
              )
            ).length,
            verdict: finalAudit.verdict,
          },
          citations: result.citations,
          grounded: result.grounded,
          mode,
          modules: moduleResults.map((module) => ({
            contextId: module.contextId,
            contextType: module.contextType,
            grounded: module.grounded,
            id: module.id,
            label: module.label,
            output: module.output.slice(0, 1600),
          })),
          type: "answer",
          webResearchUsed: references.some(
            (reference) => reference.sourceType === "web"
          ),
        });
        write({ type: "done" });
      } catch (error) {
        write({
          message:
            error instanceof Error
              ? error.message
              : "Thinker Machine stream failed.",
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
