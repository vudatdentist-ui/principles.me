import type { DecisionBrief } from "../contracts";
import type {
  DecisionRepository,
  JsonSnapshot,
} from "../persistence";
import type { EvidenceProvider } from "../../evidence/providers/evidence-provider";
import type { EvidenceReference } from "../../evidence/contracts";
import type { AiProvider } from "../../../lib/ai/providers/ai-provider";

export const DECISION_ORCHESTRATOR_PROMPT_VERSION = "v2-201.1";

export type DecisionProgressStage =
  | "context"
  | "retrieval"
  | "analysis"
  | "audit"
  | "revision"
  | "persistence";

export type DecisionProgressEvent = {
  readonly runId?: string;
  readonly stage: DecisionProgressStage;
};

export type DecisionProgressSink = (
  event: DecisionProgressEvent
) => Promise<void> | void;

export type DecisionOrchestratorRequest = {
  readonly context?: JsonSnapshot;
  readonly onProgress?: DecisionProgressSink;
  readonly question: string;
  readonly signal?: AbortSignal;
  readonly userId: string;
};

export type DecisionOrchestratorResult = {
  readonly brief: DecisionBrief;
  readonly evidence: readonly EvidenceReference[];
  readonly revisionApplied: boolean;
  readonly runId: string;
};

export type DecisionOrchestratorDependencies = {
  readonly aiProvider: AiProvider;
  readonly evidenceProviders: readonly EvidenceProvider[];
  readonly model?: string;
  readonly now?: () => Date;
  readonly repository: DecisionRepository;
};

export interface DecisionOrchestrator {
  run: (request: DecisionOrchestratorRequest) => Promise<DecisionOrchestratorResult>;
}

export type DecisionAnalysis = {
  readonly confidence: {
    readonly explanation: string;
    readonly level: "low" | "medium" | "high";
  };
  readonly counterCase: string;
  readonly nextAction: string;
  readonly reasons: readonly {
    readonly citationKeys: readonly string[];
    readonly id: string;
    readonly kind: "fact" | "inference" | "user-context";
    readonly text: string;
  }[];
  readonly recommendation: string;
  readonly review: {
    readonly suggestedAt: string | null;
    readonly trigger: string;
  };
  readonly unknowns: readonly string[];
};

export type DecisionAudit = {
  readonly decision: "accept" | "revise";
  readonly issues: readonly string[];
  readonly revisionInstructions: readonly string[];
  readonly verdict: "grounded" | "mixed" | "ungrounded";
};

export type RetrievalPlan = {
  readonly providers: readonly {
    readonly id: string;
    readonly order: number;
  }[];
  readonly strategy: "all";
};
