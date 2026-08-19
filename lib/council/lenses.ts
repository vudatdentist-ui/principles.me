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
    description: "Separate what is observed from what is merely believed.",
    id: "reality",
    keywords: [
      "fact",
      "assumption",
      "evidence",
      "reality",
      "thuc te",
      "su that",
      "du kien",
    ],
    label: "Reality & evidence",
    retrievalHint: "facts assumptions evidence reality diagnosis",
    thinkerIds: ["dalio", "aurelius"],
  },
  {
    description:
      "Look for rewards, penalties, ownership, and hidden motivations.",
    id: "incentives",
    keywords: [
      "incentive",
      "reward",
      "bonus",
      "equity",
      "ownership",
      "motivation",
      "dong luc",
      "loi ich",
    ],
    label: "Incentives",
    retrievalHint: "incentives rewards ownership motivation behavior",
    thinkerIds: ["munger", "dalio", "marx"],
  },
  {
    description: "Ask whether trust is earned, observable, and repairable.",
    id: "trust",
    keywords: [
      "trust",
      "integrity",
      "honest",
      "reliable",
      "tin tuong",
      "uy tin",
      "cofounder",
      "partner",
      "partnership",
    ],
    label: "Trust & integrity",
    retrievalHint: "trust integrity honesty reliability partnership",
    thinkerIds: ["buffett", "dalio", "aurelius"],
  },
  {
    description:
      "Examine avoidance, disagreement, truth-telling, and conflict repair.",
    id: "conflict",
    keywords: [
      "conflict",
      "disagreement",
      "difficult conversation",
      "hard conversation",
      "avoid",
      "mau thuan",
      "bat dong",
      "tranh chap",
      "ne conflict",
    ],
    label: "Conflict & candor",
    retrievalHint:
      "conflict candor disagreement difficult conversation radical truth",
    thinkerIds: ["dalio", "aurelius", "marx"],
  },
  {
    description:
      "Distinguish reversible experiments from irreversible commitments.",
    id: "reversibility",
    keywords: [
      "reversible",
      "irreversible",
      "undo",
      "pilot",
      "trial",
      "experiment",
      "test",
      "quay lai",
      "thu nghiem",
    ],
    label: "Reversibility",
    retrievalHint:
      "reversible irreversible experiment pilot optionality commitment",
    thinkerIds: ["munger", "buffett"],
  },
  {
    description:
      "Study failure modes, ruin, and margin for error before upside.",
    id: "downside",
    keywords: [
      "risk",
      "downside",
      "failure",
      "fail",
      "lose",
      "loss",
      "rui ro",
      "that bai",
      "mat",
      "bankrupt",
    ],
    label: "Downside risk",
    retrievalHint: "downside risk margin of safety failure avoid ruin",
    thinkerIds: ["buffett", "munger"],
  },
  {
    description:
      "Make unknowns and confidence explicit instead of hiding them.",
    id: "uncertainty",
    keywords: [
      "uncertain",
      "unknown",
      "confidence",
      "khong chac",
      "khong biet",
      "mo ho",
    ],
    label: "Uncertainty",
    retrievalHint: "uncertainty unknown confidence margin of safety judgment",
    thinkerIds: ["buffett", "aurelius", "dalio"],
  },
  {
    description:
      "Separate short-term pressure from durable compounding effects.",
    id: "time_horizon",
    keywords: [
      "long term",
      "short term",
      "runway",
      "compound",
      "compounding",
      "dai han",
      "ngan han",
      "6 months",
      "12 months",
    ],
    label: "Time horizon",
    retrievalHint: "long term short term compounding runway durable",
    thinkerIds: ["buffett", "dalio"],
  },
  {
    description:
      "Ask what is understood, demonstrated, and outside competence.",
    id: "competence",
    keywords: [
      "capable",
      "capability",
      "competence",
      "experience",
      "experienced",
      "senior",
      "skill",
      "gioi",
      "kinh nghiem",
      "nang luc",
    ],
    label: "Capability & competence",
    retrievalHint: "capability competence experience skill track record",
    thinkerIds: ["buffett", "munger", "dalio"],
  },
  {
    description: "Consider character, consistency, and values under pressure.",
    id: "integrity",
    keywords: [
      "character",
      "ethical",
      "ethics",
      "values",
      "honesty",
      "dao duc",
      "gia tri",
      "phẩm chat",
      "pham chat",
    ],
    label: "Character & integrity",
    retrievalHint: "integrity character honesty values reputation",
    thinkerIds: ["buffett", "aurelius"],
  },
  {
    description:
      "Map control, authority, decision rights, and structural power.",
    id: "power",
    keywords: [
      "power",
      "control",
      "authority",
      "governance",
      "voting",
      "board",
      "quyen",
      "kiem soat",
      "quan tri",
    ],
    label: "Power & governance",
    retrievalHint:
      "power control authority governance decision rights institutions",
    thinkerIds: ["marx", "dalio"],
  },
  {
    description:
      "Examine cash, resources, economics, and concrete constraints.",
    id: "material_conditions",
    keywords: [
      "cash",
      "capital",
      "cost",
      "salary",
      "revenue",
      "budget",
      "economic",
      "tien",
      "chi phi",
      "von",
      "doanh thu",
    ],
    label: "Material conditions",
    retrievalHint:
      "economic conditions cash capital cost resources material conditions",
    thinkerIds: ["marx", "buffett"],
  },
  {
    description:
      "Translate principles into observable action and operating cadence.",
    id: "execution",
    keywords: [
      "execute",
      "execution",
      "delivery",
      "ship",
      "implementation",
      "operate",
      "thuc thi",
      "trien khai",
      "ket qua",
    ],
    label: "Execution",
    retrievalHint: "execution practice implementation action results process",
    thinkerIds: ["hcm", "dalio"],
  },
  {
    description: "Consider the people affected, led, hired, or depended upon.",
    id: "people",
    keywords: [
      "team",
      "employee",
      "hire",
      "leader",
      "leadership",
      "cofounder",
      "partner",
      "people",
      "nhan su",
      "lanh dao",
      "doi ngu",
    ],
    label: "People & leadership",
    retrievalHint: "people leadership team employee partner organization",
    thinkerIds: ["hcm", "dalio"],
  },
  {
    description:
      "Prefer feedback, adaptation, and tests that improve the next decision.",
    id: "learning",
    keywords: [
      "learn",
      "learning",
      "feedback",
      "reflect",
      "adapt",
      "iterate",
      "hoc",
      "phan hoi",
      "thich nghi",
    ],
    label: "Learning loop",
    retrievalHint:
      "learning feedback reflection adaptation experiment practice",
    thinkerIds: ["hcm", "dalio"],
  },
  {
    description:
      "Separate controllable action from reactions to outside events.",
    id: "agency",
    keywords: [
      "emotion",
      "fear",
      "anger",
      "stress",
      "anxiety",
      "control",
      "cam xuc",
      "so hai",
      "cang thang",
      "kiem soat",
    ],
    label: "Agency & emotional judgment",
    retrievalHint: "agency control judgment emotion stoicism reaction",
    thinkerIds: ["aurelius"],
  },
  {
    description: "Ask what responsibility, role, and declared values require.",
    id: "duty_values",
    keywords: [
      "duty",
      "responsibility",
      "mission",
      "role",
      "value",
      "trach nhiem",
      "su menh",
      "vai tro",
      "gia tri",
    ],
    label: "Duty & values",
    retrievalHint: "duty values responsibility role principles mission",
    thinkerIds: ["aurelius", "hcm"],
  },
  {
    description: "Distinguish symptoms from the underlying mechanism.",
    id: "diagnosis",
    keywords: [
      "root cause",
      "diagnose",
      "diagnosis",
      "symptom",
      "why",
      "nguyen nhan",
      "chan doan",
      "tai sao",
    ],
    label: "Root-cause diagnosis",
    retrievalHint:
      "root cause diagnosis problem symptom mechanism five step process",
    thinkerIds: ["dalio", "munger"],
  },
  {
    description:
      "Ask what would make the choice fail before asking how it wins.",
    id: "inversion",
    keywords: [
      "what could go wrong",
      "worst",
      "prevent",
      "avoid",
      "failure",
      "that bai",
      "te nhat",
      "tranh",
    ],
    label: "Inversion & failure modes",
    retrievalHint:
      "inversion avoid stupidity failure modes what could go wrong",
    thinkerIds: ["munger", "buffett"],
  },
  {
    description:
      "Make the competing objectives and opportunity costs explicit.",
    id: "tradeoffs",
    keywords: [
      "tradeoff",
      "trade-off",
      "versus",
      " vs ",
      "either",
      "option",
      "choose",
      "nen",
      "hay",
      "lua chon",
    ],
    label: "Trade-offs",
    retrievalHint: "tradeoff opportunity cost choose option versus decision",
    thinkerIds: ["munger", "buffett", "dalio"],
  },
  {
    description:
      "Look beyond individuals to structures, rules, and institutions.",
    id: "institutions",
    keywords: [
      "system",
      "structure",
      "policy",
      "institution",
      "process",
      "he thong",
      "cau truc",
      "quy trinh",
      "chinh sach",
    ],
    label: "Systems & institutions",
    retrievalHint:
      "systems institutions structure rules organization incentives",
    thinkerIds: ["marx", "dalio"],
  },
  {
    description:
      "Map who bears the costs, gets the benefits, and must cooperate.",
    id: "stakeholders",
    keywords: [
      "customer",
      "employee",
      "investor",
      "stakeholder",
      "community",
      "khach hang",
      "nhan vien",
      "nha dau tu",
      "cong dong",
    ],
    label: "Stakeholders",
    retrievalHint:
      "stakeholders customers employees investors people interests",
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
    .sort(
      (a, b) => b.score - a.score || a.lens.label.localeCompare(b.lens.label)
    );

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
    .filter((lens) =>
      LENSES.find((item) => item.id === lens.id)?.thinkerIds.includes(thinkerId)
    )
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
        (scores.get(thinkerId) ?? 0) +
          Math.max(1, lens.score) * (3 - Math.min(index, 2))
      );
    });
  }

  const ranked = THINKERS.map((thinker) => ({
    score: scores.get(thinker.id) ?? 0,
    thinker,
  })).sort(
    (a, b) => b.score - a.score || a.thinker.name.localeCompare(b.thinker.name)
  );

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
        .filter((thinker): thinker is (typeof THINKERS)[number] =>
          Boolean(thinker)
        )
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
