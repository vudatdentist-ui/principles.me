import { THINKERS } from "@/lib/principles-graph";
import type {
  CouncilLensSelection,
  CouncilMember,
  CouncilPlan,
  RetrievalContext,
} from "./types";

type LensDefinition = {
  id: string;
  label: string;
  description: string;
  retrievalHint: string;
  keywords: string[];
  thinkerIds: string[];
};

const LENSES: LensDefinition[] = [
  {
    id: "reality",
    label: "Reality & evidence",
    description: "Separate what is observed from what is merely believed.",
    retrievalHint: "facts assumptions evidence reality diagnosis",
    keywords: ["fact", "assumption", "evidence", "reality", "thuc te", "su that", "du kien"],
    thinkerIds: ["dalio", "aurelius"],
  },
  {
    id: "incentives",
    label: "Incentives",
    description: "Look for rewards, penalties, ownership, and hidden motivations.",
    retrievalHint: "incentives rewards ownership motivation behavior",
    keywords: ["incentive", "reward", "bonus", "equity", "ownership", "motivation", "dong luc", "loi ich"],
    thinkerIds: ["munger", "dalio", "marx"],
  },
  {
    id: "trust",
    label: "Trust & integrity",
    description: "Ask whether trust is earned, observable, and repairable.",
    retrievalHint: "trust integrity honesty reliability partnership",
    keywords: ["trust", "integrity", "honest", "reliable", "tin tuong", "uy tin", "cofounder", "partner", "partnership"],
    thinkerIds: ["buffett", "dalio", "aurelius"],
  },
  {
    id: "conflict",
    label: "Conflict & candor",
    description: "Examine avoidance, disagreement, truth-telling, and conflict repair.",
    retrievalHint: "conflict candor disagreement difficult conversation radical truth",
    keywords: ["conflict", "disagreement", "difficult conversation", "hard conversation", "avoid", "mau thuan", "bat dong", "tranh chap", "ne conflict"],
    thinkerIds: ["dalio", "aurelius", "marx"],
  },
  {
    id: "reversibility",
    label: "Reversibility",
    description: "Distinguish reversible experiments from irreversible commitments.",
    retrievalHint: "reversible irreversible experiment pilot optionality commitment",
    keywords: ["reversible", "irreversible", "undo", "pilot", "trial", "experiment", "test", "quay lai", "thu nghiem"],
    thinkerIds: ["munger", "buffett"],
  },
  {
    id: "downside",
    label: "Downside risk",
    description: "Study failure modes, ruin, and margin for error before upside.",
    retrievalHint: "downside risk margin of safety failure avoid ruin",
    keywords: ["risk", "downside", "failure", "fail", "lose", "loss", "rui ro", "that bai", "mat", "bankrupt"],
    thinkerIds: ["buffett", "munger"],
  },
  {
    id: "uncertainty",
    label: "Uncertainty",
    description: "Make unknowns and confidence explicit instead of hiding them.",
    retrievalHint: "uncertainty unknown confidence margin of safety judgment",
    keywords: ["uncertain", "unknown", "confidence", "khong chac", "khong biet", "mo ho"],
    thinkerIds: ["buffett", "aurelius", "dalio"],
  },
  {
    id: "time_horizon",
    label: "Time horizon",
    description: "Separate short-term pressure from durable compounding effects.",
    retrievalHint: "long term short term compounding runway durable",
    keywords: ["long term", "short term", "runway", "compound", "compounding", "dai han", "ngan han", "6 months", "12 months"],
    thinkerIds: ["buffett", "dalio"],
  },
  {
    id: "competence",
    label: "Capability & competence",
    description: "Ask what is understood, demonstrated, and outside competence.",
    retrievalHint: "capability competence experience skill track record",
    keywords: ["capable", "capability", "competence", "experience", "experienced", "senior", "skill", "gioi", "kinh nghiem", "nang luc"],
    thinkerIds: ["buffett", "munger", "dalio"],
  },
  {
    id: "integrity",
    label: "Character & integrity",
    description: "Consider character, consistency, and values under pressure.",
    retrievalHint: "integrity character honesty values reputation",
    keywords: ["character", "ethical", "ethics", "values", "honesty", "dao duc", "gia tri", "phẩm chat", "pham chat"],
    thinkerIds: ["buffett", "aurelius"],
  },
  {
    id: "power",
    label: "Power & governance",
    description: "Map control, authority, decision rights, and structural power.",
    retrievalHint: "power control authority governance decision rights institutions",
    keywords: ["power", "control", "authority", "governance", "voting", "board", "quyen", "kiem soat", "quan tri"],
    thinkerIds: ["marx", "dalio"],
  },
  {
    id: "material_conditions",
    label: "Material conditions",
    description: "Examine cash, resources, economics, and concrete constraints.",
    retrievalHint: "economic conditions cash capital cost resources material conditions",
    keywords: ["cash", "capital", "cost", "salary", "revenue", "budget", "economic", "tien", "chi phi", "von", "doanh thu"],
    thinkerIds: ["marx", "buffett"],
  },
  {
    id: "execution",
    label: "Execution",
    description: "Translate principles into observable action and operating cadence.",
    retrievalHint: "execution practice implementation action results process",
    keywords: ["execute", "execution", "delivery", "ship", "implementation", "operate", "thuc thi", "trien khai", "ket qua"],
    thinkerIds: ["hcm", "dalio"],
  },
  {
    id: "people",
    label: "People & leadership",
    description: "Consider the people affected, led, hired, or depended upon.",
    retrievalHint: "people leadership team employee partner organization",
    keywords: ["team", "employee", "hire", "leader", "leadership", "cofounder", "partner", "people", "nhan su", "lanh dao", "doi ngu"],
    thinkerIds: ["hcm", "dalio"],
  },
  {
    id: "learning",
    label: "Learning loop",
    description: "Prefer feedback, adaptation, and tests that improve the next decision.",
    retrievalHint: "learning feedback reflection adaptation experiment practice",
    keywords: ["learn", "learning", "feedback", "reflect", "adapt", "iterate", "hoc", "phan hoi", "thich nghi"],
    thinkerIds: ["hcm", "dalio"],
  },
  {
    id: "agency",
    label: "Agency & emotional judgment",
    description: "Separate controllable action from reactions to outside events.",
    retrievalHint: "agency control judgment emotion stoicism reaction",
    keywords: ["emotion", "fear", "anger", "stress", "anxiety", "control", "cam xuc", "so hai", "cang thang", "kiem soat"],
    thinkerIds: ["aurelius"],
  },
  {
    id: "duty_values",
    label: "Duty & values",
    description: "Ask what responsibility, role, and declared values require.",
    retrievalHint: "duty values responsibility role principles mission",
    keywords: ["duty", "responsibility", "mission", "role", "value", "trach nhiem", "su menh", "vai tro", "gia tri"],
    thinkerIds: ["aurelius", "hcm"],
  },
  {
    id: "diagnosis",
    label: "Root-cause diagnosis",
    description: "Distinguish symptoms from the underlying mechanism.",
    retrievalHint: "root cause diagnosis problem symptom mechanism five step process",
    keywords: ["root cause", "diagnose", "diagnosis", "symptom", "why", "nguyen nhan", "chan doan", "tai sao"],
    thinkerIds: ["dalio", "munger"],
  },
  {
    id: "inversion",
    label: "Inversion & failure modes",
    description: "Ask what would make the choice fail before asking how it wins.",
    retrievalHint: "inversion avoid stupidity failure modes what could go wrong",
    keywords: ["what could go wrong", "worst", "prevent", "avoid", "failure", "that bai", "te nhat", "tranh"],
    thinkerIds: ["munger", "buffett"],
  },
  {
    id: "tradeoffs",
    label: "Trade-offs",
    description: "Make the competing objectives and opportunity costs explicit.",
    retrievalHint: "tradeoff opportunity cost choose option versus decision",
    keywords: ["tradeoff", "trade-off", "versus", " vs ", "either", "option", "choose", "nen", "hay", "lua chon"],
    thinkerIds: ["munger", "buffett", "dalio"],
  },
  {
    id: "institutions",
    label: "Systems & institutions",
    description: "Look beyond individuals to structures, rules, and institutions.",
    retrievalHint: "systems institutions structure rules organization incentives",
    keywords: ["system", "structure", "policy", "institution", "process", "he thong", "cau truc", "quy trinh", "chinh sach"],
    thinkerIds: ["marx", "dalio"],
  },
  {
    id: "stakeholders",
    label: "Stakeholders",
    description: "Map who bears the costs, gets the benefits, and must cooperate.",
    retrievalHint: "stakeholders customers employees investors people interests",
    keywords: ["customer", "employee", "investor", "stakeholder", "community", "khach hang", "nhan vien", "nha dau tu", "cong dong"],
    thinkerIds: ["hcm", "marx", "buffett"],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLens(input: string, lens: LensDefinition) {
  const normalized = normalize(input);
  let score = 0;
  for (const keyword of lens.keywords) {
    const needle = normalize(keyword);
    if (needle && normalized.includes(needle)) {
      score += needle.includes(" ") ? 3 : 2;
    }
  }
  return score;
}

export function classifyDecision(input: string): CouncilLensSelection[] {
  const ranked = LENSES.map((lens) => ({ lens, score: scoreLens(input, lens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.lens.label.localeCompare(b.lens.label));

  const selected = ranked.slice(0, 6);
  const fallbacks = ["reality", "tradeoffs", "uncertainty", "reversibility"];
  for (const id of fallbacks) {
    if (selected.length >= 4) {
      break;
    }
    const lens = LENSES.find((item) => item.id === id);
    if (lens && !selected.some((item) => item.lens.id === id)) {
      selected.push({ lens, score: 1 });
    }
  }

  return selected.map(({ lens, score }) => ({
    description: lens.description,
    id: lens.id,
    label: lens.label,
    retrievalHint: lens.retrievalHint,
    score,
  }));
}

function memberReason(thinkerId: string, lenses: CouncilLensSelection[]) {
  const matched = lenses
    .filter((lens) => LENSES.find((item) => item.id === lens.id)?.thinkerIds.includes(thinkerId))
    .slice(0, 2)
    .map((lens) => lens.label);
  if (matched.length === 0) {
    return "Included as a user-selected reasoning lens.";
  }
  return `Included because ${matched.join(" and ").toLowerCase()} are material to this decision.`;
}

function selectAutoMembers(lenses: CouncilLensSelection[]): CouncilMember[] {
  const scores = new Map<string, number>();
  for (const lens of lenses) {
    const definition = LENSES.find((item) => item.id === lens.id);
    definition?.thinkerIds.forEach((thinkerId, index) => {
      scores.set(
        thinkerId,
        (scores.get(thinkerId) ?? 0) + Math.max(1, lens.score) * (3 - Math.min(index, 2))
      );
    });
  }

  const ranked = THINKERS.map((thinker) => ({
    thinker,
    score: scores.get(thinker.id) ?? 0,
  })).sort((a, b) => b.score - a.score || a.thinker.name.localeCompare(b.thinker.name));

  const selected = ranked.filter((item) => item.score > 0).slice(0, 4);
  for (const fallbackId of ["dalio", "munger", "buffett"]) {
    if (selected.length >= 3) {
      break;
    }
    const fallback = ranked.find((item) => item.thinker.id === fallbackId);
    if (fallback && !selected.some((item) => item.thinker.id === fallbackId)) {
      selected.push(fallback);
    }
  }

  return selected.map(({ thinker }) => ({
    id: thinker.id,
    lens: thinker.lens,
    name: thinker.name,
    reason: memberReason(thinker.id, lenses),
  }));
}

function buildRetrievalQueries(
  question: string,
  context: string,
  lenses: CouncilLensSelection[],
  members: CouncilMember[]
) {
  const base = `${question}\nContext: ${context}`.trim();
  const queries: CouncilPlan["retrievalQueries"] = [
    {
      id: "decision",
      kind: "base",
      label: "Decision",
      query: base,
    },
  ];

  for (const lens of lenses.slice(0, 6)) {
    queries.push({
      id: lens.id,
      kind: "lens",
      label: lens.label,
      query: `${base}\nFocus lens: ${lens.label}. ${lens.retrievalHint}`,
    });
  }
  for (const member of members.slice(0, 4)) {
    queries.push({
      id: member.id,
      kind: "thinker",
      label: `${member.name} lens`,
      query: `${base}\nReasoning lens: ${member.name} — ${member.lens}`,
    });
  }
  return queries;
}

export function buildCouncilPlan({
  question,
  context = "",
  thinkerIds = [],
}: {
  question: string;
  context?: string;
  thinkerIds?: string[];
}): CouncilPlan {
  const lenses = classifyDecision(`${question}\n${context}`);
  const allowedIds = new Set(THINKERS.map((thinker) => thinker.id));
  const manualIds = [...new Set(thinkerIds)].filter((id) => allowedIds.has(id));
  const members = manualIds.length
    ? manualIds
        .map((id) => THINKERS.find((thinker) => thinker.id === id))
        .filter((thinker): thinker is (typeof THINKERS)[number] => Boolean(thinker))
        .map((thinker) => ({
          id: thinker.id,
          lens: thinker.lens,
          name: thinker.name,
          reason: memberReason(thinker.id, lenses),
        }))
    : selectAutoMembers(lenses);

  return {
    lenses,
    members,
    mode: manualIds.length ? "manual" : "auto",
    retrievalQueries: buildRetrievalQueries(question, context, lenses, members),
  };
}

export function retrievalContextFromQuery(
  query: CouncilPlan["retrievalQueries"][number]
): RetrievalContext {
  return { id: query.id, kind: query.kind, label: query.label };
}
