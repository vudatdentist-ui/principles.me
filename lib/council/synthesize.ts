import "server-only";

import { z } from "zod";
import { sanitizeCouncilBrief } from "./grounding";
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

function promptForBrief({
  question,
  context,
  plan,
  references,
}: {
  question: string;
  context: string;
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

  return `DECISION\nQuestion: ${question}\nContext from the user: ${context || "No additional context."}\n\nRELEVANT LENSES\n${lenses}\n\nCOUNCIL MEMBERS AS REASONING LENSES\n${members}\n\nLOCKED EVIDENCE\n${evidence}`;
}

export async function synthesizeCouncilBrief({
  question,
  context,
  plan,
  references,
}: {
  question: string;
  context: string;
  plan: CouncilPlan;
  references: RetrievedReference[];
}): Promise<CouncilResult> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("Thiếu DEEPSEEK_API_KEY.");
  }
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const system = `You are the evidence-backed Council in Principles, a decision reasoning system.

Use ONLY two inputs: (1) the user's decision/context and (2) LOCKED EVIDENCE. Do not use outside factual knowledge.

The selected thinkers are reasoning lenses, NOT evidence sources. Never write "Munger says", "Dalio says", or attribute a view to any thinker unless the locked evidence itself explicitly supports that attribution.

Every claim must declare one layer:
- evidence: a close summary of locked evidence. MUST include one or more citation keys such as R1.
- interpretation: a synthesis or inference from locked evidence. MUST include one or more citation keys.
- application: an application to the user's decision or a statement taken from user context. Citations are optional, but do not present it as sourced fact.

If evidence is weak or conflicting, expose the uncertainty. Do not force a recommendation. Prefer a reversible information-gathering next move when the crux is unresolved.

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
            content: promptForBrief({ context, plan, question, references }),
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
