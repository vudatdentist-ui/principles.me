import type { DecisionRun, JsonSnapshot } from "../persistence";
import type { EvidenceReference } from "../../evidence/contracts";
import { EvidenceProviderError } from "../../evidence/providers/provider-error";
import { AiProviderError } from "../../../lib/ai/providers/provider-error";
import {
  buildDecisionBrief,
  DecisionModelOutputError,
  enforceEvidencePolicy,
  parseDecisionAnalysis,
  parseDecisionAudit,
  parseDecisionFitAudit,
  parseDecisionPerspective,
  validateAnalysisCitations,
} from "./decision-brief-parser";
import {
  buildCouncilPerspectiveMessages,
  buildDecisionFitAuditMessages,
  buildEvidenceAuditMessages,
  buildRevisionMessages,
  buildSynthesisMessages,
} from "./prompts";
import { toJsonSnapshot } from "./json-snapshot";
import { createRetrievalPlan } from "./retrieval-plan";
import {
  DECISION_COUNCIL_LENSES,
  DECISION_ORCHESTRATOR_PROMPT_VERSION,
  type DecisionAnalysis,
  type DecisionAudit,
  type DecisionFitAudit,
  type DecisionOrchestrator,
  type DecisionOrchestratorDependencies,
  type DecisionOrchestratorRequest,
  type DecisionOrchestratorResult,
  type DecisionPerspective,
  type DecisionProgressStage,
} from "./types";

export type DecisionOrchestratorErrorCode =
  | "aborted"
  | "evidence_provider_failed"
  | "internal_error"
  | "invalid_model_output"
  | "invalid_request"
  | "invalid_response"
  | "model_failed"
  | "persistence_failed"
  | "provider_error"
  | "rate_limited"
  | "timeout"
  | "unauthorized"
  | "unsupported_citation";

export class DecisionOrchestratorError extends Error {
  readonly code: DecisionOrchestratorErrorCode;

  constructor(
    code: DecisionOrchestratorErrorCode,
    message: string,
    options: ErrorOptions = {}
  ) {
    super(message, options);
    this.name = "DecisionOrchestratorError";
    this.code = code;
  }
}

type EvidenceCollection = {
  readonly references: readonly EvidenceReference[];
  readonly snapshot: JsonSnapshot;
};

const DEFAULT_CONTEXT: JsonSnapshot = {};
const REASONER_MAX_TOKENS = 700;
const REASONER_TIMEOUT_MS = 25_000;
const SYNTHESIS_MAX_TOKENS = 1800;
const SYNTHESIS_TIMEOUT_MS = 35_000;
const AUDIT_MAX_TOKENS = 700;
const AUDIT_TIMEOUT_MS = 20_000;
const REVISION_MAX_TOKENS = 1800;
const REVISION_TIMEOUT_MS = 35_000;

function normalizeQuestion(question: string): string {
  const normalized = question.trim();
  if (normalized.length < 3) {
    throw new DecisionOrchestratorError(
      "invalid_request",
      "Decision question must contain at least three characters."
    );
  }
  return normalized;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DecisionOrchestratorError("aborted", "Decision run was aborted.", {
      cause: signal.reason,
    });
  }
}

async function emitProgress(
  request: DecisionOrchestratorRequest,
  stage: DecisionProgressStage,
  runId: string,
  references?: readonly EvidenceReference[]
): Promise<void> {
  await request.onProgress?.({
    ...(references === undefined ? {} : { references }),
    runId,
    stage,
  });
}

function aiErrorMessage(code: AiProviderError["code"]): string {
  switch (code) {
    case "aborted":
      return "Decision run was aborted.";
    case "invalid_model_output":
      return "AI model output was invalid.";
    case "invalid_response":
      return "AI provider returned an invalid response.";
    case "provider_error":
      return "AI provider request failed.";
    case "rate_limited":
      return "AI provider rate limit was reached.";
    case "timeout":
      return "AI provider request timed out.";
    case "unauthorized":
      return "AI provider authorization failed.";
    default:
      return "AI model request failed.";
  }
}

function normalizeError(
  error: unknown,
  signal: AbortSignal
): DecisionOrchestratorError {
  if (error instanceof DecisionOrchestratorError) {
    return error;
  }
  if (error instanceof DecisionModelOutputError) {
    return new DecisionOrchestratorError(error.code, error.message, {
      cause: error,
    });
  }
  if (error instanceof EvidenceProviderError) {
    return new DecisionOrchestratorError(
      error.code === "aborted" ? "aborted" : "evidence_provider_failed",
      error.code === "aborted"
        ? "Decision run was aborted."
        : "Evidence retrieval failed.",
      { cause: error }
    );
  }
  if (error instanceof AiProviderError) {
    return new DecisionOrchestratorError(error.code, aiErrorMessage(error.code), {
      cause: error,
    });
  }
  if (signal.aborted) {
    return new DecisionOrchestratorError("aborted", "Decision run was aborted.", {
      cause: error,
    });
  }
  return new DecisionOrchestratorError(
    "internal_error",
    "Decision run failed during application processing.",
    { cause: error }
  );
}

function persistenceFailure(error: unknown): DecisionOrchestratorError {
  return new DecisionOrchestratorError(
    "persistence_failed",
    "Decision persistence failed.",
    { cause: error }
  );
}

function ensureUniqueEvidenceKeys(references: readonly EvidenceReference[]): void {
  const keys = new Set<string>();
  for (const reference of references) {
    if (keys.has(reference.key)) {
      throw new DecisionOrchestratorError(
        "evidence_provider_failed",
        `Duplicate evidence key returned by providers: ${reference.key}`
      );
    }
    keys.add(reference.key);
  }
}

async function collectEvidence(
  dependencies: DecisionOrchestratorDependencies,
  question: string,
  signal: AbortSignal,
  retrievedAt: string
): Promise<EvidenceCollection> {
  const results = await Promise.all(
    dependencies.evidenceProviders.map(async (provider) => ({
      id: provider.id,
      result: await provider.retrieve({ question }, signal),
    }))
  );
  const references = results.flatMap(({ result }) => result.references);
  ensureUniqueEvidenceKeys(references);

  return {
    references,
    snapshot: toJsonSnapshot({
      providers: results.map(({ id, result }) => ({
        id,
        referenceCount: result.references.length,
        retrievedAt: result.retrievedAt,
      })),
      references,
      retrievedAt,
    }),
  };
}

function analysisSnapshot(
  perspectives: readonly DecisionPerspective[],
  initial: DecisionAnalysis,
  revised: DecisionAnalysis | null
): JsonSnapshot {
  return toJsonSnapshot(
    revised
      ? { council: perspectives, initial, revised }
      : { council: perspectives, initial }
  );
}

function auditSnapshot(
  audit: DecisionAudit,
  decisionFitAudit: DecisionFitAudit,
  revisionApplied: boolean
): JsonSnapshot {
  return toJsonSnapshot({ audit, decisionFitAudit, revisionApplied });
}

function requiresRevision(
  evidenceAudit: DecisionAudit,
  decisionFitAudit: DecisionFitAudit
): boolean {
  return (
    evidenceAudit.decision === "revise" || decisionFitAudit.decision === "revise"
  );
}

export function createDecisionOrchestrator(
  dependencies: DecisionOrchestratorDependencies
): DecisionOrchestrator {
  const now = dependencies.now ?? (() => new Date());
  const retrievalPlan = createRetrievalPlan(dependencies.evidenceProviders);
  const reasonerProvider = dependencies.reasonerProvider ?? dependencies.aiProvider;
  const synthesisProvider = dependencies.synthesisProvider ?? dependencies.aiProvider;
  const auditProvider = dependencies.auditProvider ?? dependencies.aiProvider;
  const revisionProvider = dependencies.revisionProvider ?? dependencies.aiProvider;

  return {
    async run(request): Promise<DecisionOrchestratorResult> {
      const question = normalizeQuestion(request.question);
      const context = request.context ?? DEFAULT_CONTEXT;
      const signal = request.signal ?? new AbortController().signal;

      let runId: string | null = null;
      try {
        let run: DecisionRun;
        try {
          run = await dependencies.repository.createRun({
            contextSnapshot: context,
            model: dependencies.model ?? synthesisProvider.id,
            promptVersion: DECISION_ORCHESTRATOR_PROMPT_VERSION,
            question,
            retrievalPlan: toJsonSnapshot(retrievalPlan),
            startedAt: now(),
            userId: request.userId,
          });
        } catch (error) {
          throw persistenceFailure(error);
        }
        runId = run.id;
        throwIfAborted(signal);

        await emitProgress(request, "context", runId);
        await emitProgress(request, "retrieval", runId);
        const retrievedAt = now().toISOString();
        const evidence = await collectEvidence(
          dependencies,
          question,
          signal,
          retrievedAt
        );
        throwIfAborted(signal);

        await emitProgress(
          request,
          "analysis",
          runId,
          evidence.references
        );

        const perspectives = await Promise.all(
          DECISION_COUNCIL_LENSES.map(async (lens) =>
            reasonerProvider.generateObject({
              maxTokens: REASONER_MAX_TOKENS,
              messages: buildCouncilPerspectiveMessages({
                context,
                evidence: evidence.references,
                lens,
                question,
              }),
              model: dependencies.model,
              parse: (value) => parseDecisionPerspective(value, lens),
              signal,
              temperature: 0.35,
              timeoutMs: REASONER_TIMEOUT_MS,
            })
          )
        );
        throwIfAborted(signal);

        let initialAnalysis = await synthesisProvider.generateObject({
          maxTokens: SYNTHESIS_MAX_TOKENS,
          messages: buildSynthesisMessages({
            context,
            evidence: evidence.references,
            perspectives,
            question,
          }),
          model: dependencies.model,
          parse: parseDecisionAnalysis,
          signal,
          temperature: 0.15,
          timeoutMs: SYNTHESIS_TIMEOUT_MS,
        });
        validateAnalysisCitations(initialAnalysis, evidence.references);
        initialAnalysis = enforceEvidencePolicy(
          initialAnalysis,
          evidence.references
        );
        throwIfAborted(signal);

        await emitProgress(request, "audit", runId);
        const [evidenceAudit, decisionFitAudit] = await Promise.all([
          auditProvider.generateObject({
            maxTokens: AUDIT_MAX_TOKENS,
            messages: buildEvidenceAuditMessages({
              analysis: initialAnalysis,
              evidence: evidence.references,
              question,
            }),
            model: dependencies.model,
            parse: parseDecisionAudit,
            signal,
            temperature: 0,
            timeoutMs: AUDIT_TIMEOUT_MS,
          }),
          auditProvider.generateObject({
            maxTokens: AUDIT_MAX_TOKENS,
            messages: buildDecisionFitAuditMessages({
              analysis: initialAnalysis,
              context,
              question,
            }),
            model: dependencies.model,
            parse: parseDecisionFitAudit,
            signal,
            temperature: 0,
            timeoutMs: AUDIT_TIMEOUT_MS,
          }),
        ]);
        throwIfAborted(signal);

        let revisedAnalysis: DecisionAnalysis | null = null;
        if (requiresRevision(evidenceAudit, decisionFitAudit)) {
          await emitProgress(request, "revision", runId);
          revisedAnalysis = await revisionProvider.generateObject({
            maxTokens: REVISION_MAX_TOKENS,
            messages: buildRevisionMessages({
              analysis: initialAnalysis,
              context,
              decisionFitAudit,
              evidence: evidence.references,
              evidenceAudit,
              perspectives,
              question,
            }),
            model: dependencies.model,
            parse: parseDecisionAnalysis,
            signal,
            temperature: 0.1,
            timeoutMs: REVISION_TIMEOUT_MS,
          });
          validateAnalysisCitations(revisedAnalysis, evidence.references);
          revisedAnalysis = enforceEvidencePolicy(
            revisedAnalysis,
            evidence.references
          );
          throwIfAborted(signal);
        }

        const finalAnalysis = revisedAnalysis ?? initialAnalysis;
        const brief = buildDecisionBrief({
          analysis: finalAnalysis,
          evidence: evidence.references,
          question,
          runId,
          validAsOf: now().toISOString(),
        });

        await emitProgress(request, "persistence", runId);
        try {
          await dependencies.repository.completeRun({
            analysisSnapshot: analysisSnapshot(
              perspectives,
              initialAnalysis,
              revisedAnalysis
            ),
            auditSnapshot: auditSnapshot(
              evidenceAudit,
              decisionFitAudit,
              revisedAnalysis !== null
            ),
            completedAt: now(),
            decisionBrief: brief,
            evidenceSnapshot: evidence.snapshot,
            id: runId,
            userId: request.userId,
          });
        } catch (error) {
          throw persistenceFailure(error);
        }

        return {
          brief,
          evidence: evidence.references,
          revisionApplied: revisedAnalysis !== null,
          runId,
        };
      } catch (error) {
        const normalized = normalizeError(error, signal);
        if (runId) {
          try {
            await dependencies.repository.failRun({
              errorCode: normalized.code,
              failedAt: now(),
              id: runId,
              userId: request.userId,
            });
          } catch {
            // Preserve the original application failure. A repository may reject
            // failRun when another terminal transition already won the race.
          }
        }
        throw normalized;
      }
    },
  };
}
