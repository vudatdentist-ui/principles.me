import type {
  CouncilBrief,
  CouncilClaim,
  CouncilResult,
  FactAssumption,
  RetrievedReference,
} from "./types";

const THINKER_ALIASES = [
  "dalio",
  "munger",
  "buffett",
  "marx",
  "ho chi minh",
  "hcm",
  "marcus aurelius",
  "aurelius",
];

const ATTRIBUTION_CUES = [
  "says",
  "said",
  "argues",
  "argued",
  "believes",
  "believed",
  "writes",
  "wrote",
  "according to",
  "theo",
  "cho rang",
  "noi",
  "viet",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPersonaAttribution(value: string) {
  const normalized = normalizeText(value);
  const namesThinker = THINKER_ALIASES.some((alias) =>
    normalized.includes(alias)
  );
  const attributesClaim = ATTRIBUTION_CUES.some((cue) =>
    normalized.includes(cue)
  );
  return namesThinker && attributesClaim;
}

function normalizeCitation(value: string) {
  return value.trim().replace(/^\[/, "").replace(/\]$/, "").toUpperCase();
}

function sanitizeClaim(
  claim: CouncilClaim,
  allowed: Set<string>
): CouncilClaim | null {
  const citations = [
    ...new Set(
      (claim.citations ?? [])
        .map(normalizeCitation)
        .filter((citation) => allowed.has(citation))
    ),
  ];
  const text = claim.text?.trim();
  if (!text || hasPersonaAttribution(text)) {
    return null;
  }
  if (claim.layer !== "application" && citations.length === 0) {
    return null;
  }
  return { citations, layer: claim.layer, text };
}

function sanitizeClaims(claims: CouncilClaim[], allowed: Set<string>) {
  return claims
    .map((claim) => sanitizeClaim(claim, allowed))
    .filter((claim): claim is CouncilClaim => Boolean(claim));
}

function sanitizeFacts(items: FactAssumption[], allowed: Set<string>) {
  return items
    .map((item) => {
      const claim = sanitizeClaim(item, allowed);
      return claim ? { ...claim, status: item.status } : null;
    })
    .filter((item): item is FactAssumption => Boolean(item));
}

function fallbackBrief(situation: string): CouncilBrief {
  return {
    agreement: [],
    crux: [],
    disagreement: [],
    factsVsAssumptions: [],
    nextMoves: [],
    reversibilityDownside: [],
    situation: {
      citations: [],
      layer: "application",
      text:
        situation.trim() || "Decision context could not be summarized safely.",
    },
    unknowns: [
      {
        citations: [],
        layer: "application",
        text: "Council could not produce enough citation-backed reasoning to form a grounded brief.",
      },
    ],
  };
}

export function sanitizeCouncilBrief({
  brief,
  references,
  situation,
}: {
  brief: CouncilBrief;
  references: RetrievedReference[];
  situation: string;
}): CouncilResult {
  const allowed = new Set(references.map((reference) => reference.key));
  const sanitized: CouncilBrief = {
    agreement: sanitizeClaims(brief.agreement ?? [], allowed),
    crux: sanitizeClaims(brief.crux ?? [], allowed),
    disagreement: sanitizeClaims(brief.disagreement ?? [], allowed),
    factsVsAssumptions: sanitizeFacts(brief.factsVsAssumptions ?? [], allowed),
    nextMoves: sanitizeClaims(brief.nextMoves ?? [], allowed),
    reversibilityDownside: sanitizeClaims(
      brief.reversibilityDownside ?? [],
      allowed
    ),
    situation: sanitizeClaim(brief.situation, allowed) ?? {
      citations: [],
      layer: "application",
      text: situation.trim(),
    },
    unknowns: sanitizeClaims(brief.unknowns ?? [], allowed),
  };

  const citations = [
    ...new Set(
      [
        sanitized.situation,
        ...sanitized.factsVsAssumptions,
        ...sanitized.agreement,
        ...sanitized.disagreement,
        ...sanitized.crux,
        ...sanitized.unknowns,
        ...sanitized.reversibilityDownside,
        ...sanitized.nextMoves,
      ].flatMap((claim) => claim.citations)
    ),
  ];

  const grounded = citations.length > 0;
  return {
    brief: grounded ? sanitized : fallbackBrief(situation),
    citations: grounded ? citations : [],
    grounded,
  };
}

export function briefToText(brief: CouncilBrief) {
  const formatClaim = (claim: CouncilClaim) => {
    const citations = claim.citations.map((key) => `[${key}]`).join(" ");
    return `${claim.text}${citations ? ` ${citations}` : ""}`;
  };
  const section = (title: string, claims: CouncilClaim[]) =>
    claims.length
      ? `${title}\n${claims.map((claim) => `- ${formatClaim(claim)}`).join("\n")}`
      : `${title}\n- No grounded claim.`;

  return [
    `The situation\n${formatClaim(brief.situation)}`,
    `Facts vs assumptions\n${
      brief.factsVsAssumptions
        .map((item) => `- ${item.status}: ${formatClaim(item)}`)
        .join("\n") || "- Not classified."
    }`,
    section("Where the council agrees", brief.agreement),
    section("Where it disagrees", brief.disagreement),
    section("The crux", brief.crux),
    section("What you still don't know", brief.unknowns),
    section("Reversibility & downside", brief.reversibilityDownside),
    section("Suggested next move", brief.nextMoves),
  ].join("\n\n");
}
