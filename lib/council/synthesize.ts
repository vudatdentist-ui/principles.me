import "server-only";

import { z } from "zod";
import type { PersonalContext } from "@/lib/personal-brain/types";
import { sanitizeCouncilBrief } from "./grounding";
import { COUNCIL_TRUST_BOUNDARY } from "./security";
import type {
  CouncilBrief,
  CouncilPlan,
  CouncilResult,
  RetrievedReference,
} from "./types";

const layerSchema = z.enum(["evidence", "interpretation", "application"]);
const claimSchema = z.object({
  citations: z.array(z.string()).max(8).default([]),
  layer: layerSchema,
  text: z.string().trim().min(1).max(3000),
});
const factSchema = claimSchema.extend({
  status: z.enum(["fact", "assumption", "unknown"]),
});
const briefSchema = z.object({
  agreement: z.array(claimSchema).max(8).default([]),
  crux: z.array(claimSchema).max(6).default([]),
  disagreement: z.array(claimSchema).max(8).default([]),
  factsVsAssumptions: z.array(factSchema).max(12).default([]),
  nextMoves: z.array(claimSchema).max(8).default([]),
  reversibilityDownside: z.array(claimSchema).max(8).default([]),
  situation: claimSchema,
  unknowns: z.array(claimSchema).max(8).default([]),
});

function parseJsonObject(value: string) {
  const stripped = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first < 0 || last <= first) {
    throw new Error("DeepSeek did not return a structured Council brief.");
  }
  return JSON.parse(stripped.slice(first, last + 1)) as unknown;
}

function personalMemoryText(personalContext: PersonalContext) {
  const principles = personalContext.principles.length
    ? personalContext.principles
        .map((item) => {
          const origin = item.originDecision
            ? ` Adopted after decision ${item.originDecision.id}: ${item.originDecision.title}.`
            : "";
          return `- [P:${item.id}] ${item.statement}.${origin}`;
        })
        .join("\n")
    : "- No relevant adopted principle was retrieved.";
  const decisions = personalContext.similarDecisions.length
    ? personalContext.similarDecisions
        .map(
          (item) =>
            `- [D:${item.id}] ${item.question}${item.judgment ? ` Prior judgment: ${item.judgment}` : ""}`
        )
        .join("\n")
    : "- No similar prior decision was retrieved.";
  const tensions = personalContext.contradictions.length
    ? personalContext.contradictions
        .map(
          (item) =>
            `- Possible tension with [P:${item.principleId}] ${item.principleStatement}. ${item.prompt}`
        )
        .join("\n")
    : "- No contradiction signal was detected.";

  return `PERSONAL MEMORY — USER-OWNED CONTEXT, NOT EXTERNAL EVIDENCE\nMy Principles\n${principles}\n\nMy Decisions\n${decisions}\n\nPossible contradictions\n${tensions}`;
}

function promptForBrief({
  question,
  context,
  personalContext,
  plan,
  references,
}: {
  question: string;
  context: string;
  personalContext: PersonalContext;
  plan: CouncilPlan;
  references: RetrievedReference[];
}) {
  const members = plan.members
    .map((member) => `- ${member.name}: ${member.lens}. ${member.reason}`)
    .join("\n");
  const lenses = plan.lenses
    .map((lens) => `- ${lens.label}: ${lens.description}`)
    .join("\n");
  const evidence = references
    .map(
      (reference) => `[${reference.key}] ${reference.title}\n${reference.text}`
    )
    .join("\n\n");

  return `DECISION\nQuestion: ${question}\nContext from the user: ${context || "No additional context."}\n\n${personalMemoryText(personalContext)}\n\nRELEVANT LENSES\n${lenses}\n\nCOUNCIL MEMBERS AS REASONING LENSES\n${members}\n\nLOCKED EXTERNAL EVIDENCE\n${evidence}`;
}

export async function synthesizeCouncilBrief({
  question,
  context,
  personalContext,
  plan,
  references,
}: {
  question: string;
  context: string;
  personalContext: PersonalContext;
  plan: CouncilPlan;
  references: RetrievedReference[];
}): Promise<CouncilResult> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("Thiếu DEEPSEEK_API_KEY.");
  }
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const system = `You are the evidence-backed Council in Principles, a decision reasoning system.

${COUNCIL_TRUST_BOUNDARY}

You receive three context layers that MUST remain distinct:
1. The user's current decision/context.
2. PERSONAL MEMORY: the user's own previously adopted principles and prior decisions. This is user-owned context, not external evidence.
3. LOCKED EXTERNAL EVIDENCE: source-backed RAG chunks identified by R1, R2, etc.

Do not use outside factual knowledge. The selected thinkers are reasoning lenses, NOT evidence sources. Never write "Munger says", "Dalio says", or attribute a view to any thinker unless LOCKED EXTERNAL EVIDENCE explicitly supports that attribution.

Every claim must declare one layer:
- evidence: a close summary of LOCKED EXTERNAL EVIDENCE. MUST include one or more R citation keys.
- interpretation: a synthesis or inference from LOCKED EXTERNAL EVIDENCE. MUST include one or more R citation keys.
- application: an application to the user's current decision, current context, or PERSONAL MEMORY. R citations are optional. Never attach an R citation merely because a personal principle or prior decision exists.

Personal principles and prior decisions may make the application more specific, but never present them as universal facts. If a current judgment appears to conflict with prior personal memory, frame it neutrally as a question about changed principles or materially different circumstances.

If external evidence is weak or conflicting, expose the uncertainty. Do not force a recommendation. Prefer a reversible information-gathering next move when the crux is unresolved.

Return VALID JSON ONLY with exactly this shape:
{
  "situation": {"text":"...","layer":"application","citations":[]},
  "factsVsAssumptions": [{"status":"fact|assumption|unknown","text":"...","layer":"evidence|interpretation|application","citations":["R1"]}],
  "agreement": [{"text":"...","layer":"interpretation","citations":["R1"]}],
  "disagreement": [{"text":"...","layer":"interpretation","citations":["R1","R2"]}],
  "crux": [{"text":"...","layer":"interpretation|application","citations":["R1"]}],
  "unknowns": [{"text":"...","layer":"application","citations":[]}],
  "reversibilityDownside": [{"text":"...","layer":"interpretation|application","citations":["R1"]}],
  "nextMoves": [{"text":"...","layer":"application","citations":["R1"]}]
}

Use the same natural language as the user's decision when practical. Keep each item concise and decision-useful.`;

  const response = await fetch(
    `${(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "")}/chat/completions`,
    {
      body: JSON.stringify({
        messages: [
          { content: system, role: "system" },
          {
            content: promptForBrief({
              context,
              personalContext,
              plan,
              question,
              references,
            }),
            role: "user",
          },
        ],
        model,
        stream: false,
        temperature: 0.1,
      }),
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(55_000),
    }
  );
  if (!response.ok) {
    throw new Error(`DeepSeek trả về HTTP ${response.status}.`);
  }
  const payload = await response.json().catch(() => ({}));
  const content = String(payload?.choices?.[0]?.message?.content ?? "");
  const parsed = briefSchema.safeParse(parseJsonObject(content));
  if (!parsed.success) {
    throw new Error("DeepSeek returned an invalid Council brief schema.");
  }

  return sanitizeCouncilBrief({
    brief: parsed.data as CouncilBrief,
    references,
    situation: context || question,
  });
}
