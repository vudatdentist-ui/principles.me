export type ThinkerMachineMode = "adaptive" | "high" | "max";

export type ThinkerMachineModuleId =
  | "evidence"
  | "first-principles"
  | "inversion"
  | "systems"
  | "action";

export type ThinkerMachineModule = {
  id: ThinkerMachineModuleId;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  instruction: string;
};

/**
 * These are processing passes, not personalities or persistent thinker agents.
 * Each pass receives a fresh prompt and an isolated context window.
 */
export const THINKER_MACHINE_MODULES: ThinkerMachineModule[] = [
  {
    accent: "#65efad",
    description: "Extracts what the source corpus actually supports.",
    id: "evidence",
    instruction:
      "Act as the Evidence Analyst. Work only from the supplied evidence packet. Extract supported claims, cite the evidence keys, identify gaps, and refuse unsupported factual conclusions. Do not use general model knowledge.",
    label: "Evidence Analyst",
    shortLabel: "Evidence",
  },
  {
    accent: "#b07dff",
    description: "Reframes the question from first principles.",
    id: "first-principles",
    instruction:
      "Act as the First-Principles Reasoner. Think independently from the question and constraints. Offer assumptions, mechanisms, and hypotheses. You have no source authority, so do not add citations or present general knowledge as retrieved evidence.",
    label: "First Principles",
    shortLabel: "Fundamentals",
  },
  {
    accent: "#ff708d",
    description: "Looks for failure modes, asymmetry, and blind spots.",
    id: "inversion",
    instruction:
      "Act as the Inversion and Risk Analyst. Search for ways the proposed thinking could fail, hidden assumptions, second-order risks, and disconfirming cases. Treat all uncited claims as hypotheses, not facts.",
    label: "Inversion / Risk",
    shortLabel: "Inversion",
  },
  {
    accent: "#4f8fff",
    description: "Maps incentives, systems, and longer-term consequences.",
    id: "systems",
    instruction:
      "Act as the Systems Analyst. Model incentives, feedback loops, stakeholders, constraints, and second-order effects. Keep factual claims separate from reasoning and do not invent sources.",
    label: "Systems Lens",
    shortLabel: "Systems",
  },
  {
    accent: "#ffc15f",
    description: "Translates the analysis into a decision the user can test.",
    id: "action",
    instruction:
      "Act as the Action Analyst. Use the user's context and Principles Me context when supplied. Turn the analysis into options, tests, and questions for the user. Do not silently write to Principles Me and do not make unsupported factual claims.",
    label: "Action Lens",
    shortLabel: "Action",
  },
];

export function modeLabel(mode: ThinkerMachineMode): string {
  if (mode === "high") {
    return "High";
  }
  if (mode === "max") {
    return "Max";
  }
  return "Adaptive";
}

export function modeDescription(mode: ThinkerMachineMode): string {
  if (mode === "high") {
    return "Five isolated reasoning contexts, then synthesis.";
  }
  if (mode === "max") {
    return "Five contexts, synthesis, adversarial critique, and revision.";
  }
  return "The machine chooses a 3- or 5-pass run from the question.";
}

function appearsComplex(question: string): boolean {
  const normalized = question.toLocaleLowerCase();
  const complexitySignals = [
    "decision",
    "risk",
    "trade-off",
    "tradeoff",
    "should i",
    "what if",
    "strategy",
    "restructure",
    "investment",
    "hire",
    "fire",
    "quit",
    "politic",
    "invest",
    "quyết định",
    "rủi ro",
    "đánh đổi",
    "chiến lược",
  ];
  return (
    question.trim().length > 180 ||
    complexitySignals.some((signal) => normalized.includes(signal))
  );
}

export function selectModules(
  question: string,
  mode: ThinkerMachineMode
): ThinkerMachineModule[] {
  if (mode === "high" || mode === "max" || appearsComplex(question)) {
    return THINKER_MACHINE_MODULES;
  }
  return THINKER_MACHINE_MODULES.filter((module) =>
    ["evidence", "first-principles", "action"].includes(module.id)
  );
}

export function isFreshnessSensitive(question: string): boolean {
  return /(today|latest|current|recent|news|price|law|regulation|schedule|hôm nay|mới nhất|hiện tại|tin tức|giá|luật|quy định)/i.test(
    question
  );
}
