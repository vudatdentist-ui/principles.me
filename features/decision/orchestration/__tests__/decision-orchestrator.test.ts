import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionBrief } from "../../contracts";
import type {
  CreateDecisionRunInput,
  DecisionRepository,
  DecisionRun,
  JsonSnapshot,
} from "../../persistence";
import type { EvidenceReference } from "../../../evidence/contracts";
import type { EvidenceProvider } from "../../../evidence/providers/evidence-provider";
import { EvidenceProviderError } from "../../../evidence/providers/provider-error";
import type { AiProvider } from "../../../../lib/ai/providers/ai-provider";
import type { GenerateObjectRequest } from "../../../../lib/ai/providers/types";
import {
  createDecisionOrchestrator,
  DecisionOrchestratorError,
} from "../decision-orchestrator";
import type { DecisionAnalysis, DecisionAudit } from "../types";

const NOW = new Date("2026-08-21T12:00:00.000Z");

function reference(key = "R1"): EvidenceReference {
  return {
    chunkId: "chunk-1",
    datasetId: "dataset-1",
    documentId: "document-1",
    key,
    observedAt: null,
    positions: [],
    provider: "ragflow",
    publishedAt: null,
    retrievedAt: NOW.toISOString(),
    score: 0.9,
    sourceType: "ragflow",
    text: "The evidence supports the factual reason.",
    title: "Evidence source",
    url: null,
  };
}

function analysis(overrides: Partial<DecisionAnalysis> = {}): DecisionAnalysis {
  return {
    confidence: {
      explanation: "Evidence is reasonably strong.",
      level: "high",
    },
    counterCase: "The evidence may not generalize.",
    nextAction: "Run a limited pilot.",
    reasons: [
      {
        citationKeys: ["R1"],
        id: "r1",
        kind: "fact",
        text: "The retrieved evidence supports the option.",
      },
      {
        citationKeys: [],
        id: "r2",
        kind: "inference",
        text: "A small pilot limits downside.",
      },
      {
        citationKeys: [],
        id: "r3",
        kind: "inference",
        text: "The next step is reversible.",
      },
    ],
    recommendation: "Proceed with a limited pilot.",
    review: {
      suggestedAt: null,
      trigger: "Review after the pilot produces measurable results.",
    },
    unknowns: ["Long-term effects remain uncertain."],
    ...overrides,
  };
}

const ACCEPT_AUDIT: DecisionAudit = {
  decision: "accept",
  issues: [],
  revisionInstructions: [],
  verdict: "grounded",
};

class MockAiProvider implements AiProvider {
  readonly id = "mock-ai";
  readonly calls: GenerateObjectRequest<unknown>[] = [];

  constructor(private readonly queue: unknown[]) {}

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    this.calls.push(request as GenerateObjectRequest<unknown>);
    const value = this.queue.shift();
    if (value instanceof Error) {
      throw value;
    }
    return request.parse(value);
  }

  async generateText(): Promise<string> {
    throw new Error("Unexpected text generation call.");
  }

  async *streamText(): AsyncIterable<string> {
    throw new Error("Unexpected streaming call.");
  }
}

type RepositoryState = {
  completeCalls: number;
  createCalls: number;
  failCalls: number;
  lastBrief: DecisionBrief | null;
  lastCompleteAnalysis: JsonSnapshot | null;
  lastCompleteAudit: JsonSnapshot | null;
  lastCreate: CreateDecisionRunInput | null;
  lastEvidence: JsonSnapshot | null;
  lastFailCode: string | null;
};

function makeRun(input: CreateDecisionRunInput, brief: DecisionBrief | null): DecisionRun {
  return {
    analysisSnapshot: null,
    auditSnapshot: null,
    completedAt: brief ? NOW : null,
    contextSnapshot: input.contextSnapshot,
    decisionBrief: brief,
    decisionId: null,
    errorCode: null,
    evidenceSnapshot: null,
    failedAt: null,
    id: "run-1",
    model: input.model,
    promptVersion: input.promptVersion,
    question: input.question,
    retrievalPlan: input.retrievalPlan,
    startedAt: input.startedAt ?? NOW,
    userId: input.userId,
  };
}

function repositoryMock(options: { completeError?: Error; failError?: Error } = {}): {
  repository: DecisionRepository;
  state: RepositoryState;
} {
  const state: RepositoryState = {
    completeCalls: 0,
    createCalls: 0,
    failCalls: 0,
    lastBrief: null,
    lastCompleteAnalysis: null,
    lastCompleteAudit: null,
    lastCreate: null,
    lastEvidence: null,
    lastFailCode: null,
  };

  const repository: DecisionRepository = {
    async completeRun(input) {
      state.completeCalls += 1;
      state.lastBrief = input.decisionBrief;
      state.lastCompleteAnalysis = input.analysisSnapshot;
      state.lastCompleteAudit = input.auditSnapshot;
      state.lastEvidence = input.evidenceSnapshot;
      if (options.completeError) {
        throw options.completeError;
      }
      const create = state.lastCreate;
      if (!create) {
        throw new Error("createRun was not called.");
      }
      return makeRun(create, input.decisionBrief);
    },
    async createDecision() {
      throw new Error("createDecision must not be called by the orchestrator.");
    },
    async createRun(input) {
      state.createCalls += 1;
      state.lastCreate = input;
      return makeRun(input, null);
    },
    async failRun(input) {
      state.failCalls += 1;
      state.lastFailCode = input.errorCode;
      if (options.failError) {
        throw options.failError;
      }
    },
    async getDecision() {
      return null;
    },
    async getRun() {
      return null;
    },
    async listDueForReview() {
      return [];
    },
    async listRecent() {
      return [];
    },
  };

  return { repository, state };
}

function providerWith(references: readonly EvidenceReference[]): EvidenceProvider {
  return {
    id: "ragflow",
    async retrieve(_request, _signal) {
      return { references: [...references], retrievedAt: NOW.toISOString() };
    },
  };
}

function orchestratorFixture(input: {
  ai: MockAiProvider;
  provider?: EvidenceProvider;
  repository?: ReturnType<typeof repositoryMock>;
}) {
  const repository = input.repository ?? repositoryMock();
  return {
    orchestrator: createDecisionOrchestrator({
      aiProvider: input.ai,
      evidenceProviders: [input.provider ?? providerWith([reference()])],
      now: () => NOW,
      repository: repository.repository,
    }),
    repository,
  };
}

async function rejectsWithCode(
  promise: Promise<unknown>,
  code: DecisionOrchestratorError["code"]
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    if (!(error instanceof DecisionOrchestratorError)) {
      return false;
    }
    assert.equal(error.code, code);
    return true;
  });
}

test("happy path uses one analysis and one audit call without revision", async () => {
  const ai = new MockAiProvider([analysis(), ACCEPT_AUDIT]);
  const { orchestrator, repository } = orchestratorFixture({ ai });
  const stages: string[] = [];

  const result = await orchestrator.run({
    onProgress: ({ stage }) => {
      stages.push(stage);
    },
    question: "Should we run the pilot?",
    userId: "user-1",
  });

  assert.equal(ai.calls.length, 2);
  assert.equal(result.revisionApplied, false);
  assert.equal(repository.state.createCalls, 1);
  assert.equal(repository.state.completeCalls, 1);
  assert.equal(repository.state.failCalls, 0);
  assert.deepEqual(stages, [
    "context",
    "retrieval",
    "analysis",
    "audit",
    "persistence",
  ]);
});

test("audit-triggered revision performs exactly one additional model call", async () => {
  const revised = analysis({ recommendation: "Proceed only after one safeguard." });
  const ai = new MockAiProvider([
    analysis(),
    {
      decision: "revise",
      issues: ["Add a safeguard."],
      revisionInstructions: ["Make the safeguard explicit."],
      verdict: "mixed",
    } satisfies DecisionAudit,
    revised,
  ]);
  const { orchestrator, repository } = orchestratorFixture({ ai });

  const result = await orchestrator.run({
    question: "Should we run the pilot?",
    userId: "user-1",
  });

  assert.equal(ai.calls.length, 3);
  assert.equal(result.revisionApplied, true);
  assert.equal(result.brief.recommendation, revised.recommendation);
  assert.equal(repository.state.completeCalls, 1);
});

test("revision path never runs a second audit or second revision", async () => {
  const ai = new MockAiProvider([
    analysis(),
    {
      decision: "revise",
      issues: ["Revise once."],
      revisionInstructions: ["Tighten confidence."],
      verdict: "mixed",
    } satisfies DecisionAudit,
    analysis({ confidence: { explanation: "Still uncertain.", level: "medium" } }),
    new Error("A fourth model call must never occur."),
  ]);
  const { orchestrator } = orchestratorFixture({ ai });

  await orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" });
  assert.equal(ai.calls.length, 3);
});

test("retrieved evidence and citation keys are preserved in the brief", async () => {
  const source = reference("R1");
  const ai = new MockAiProvider([analysis(), ACCEPT_AUDIT]);
  const { orchestrator, repository } = orchestratorFixture({
    ai,
    provider: providerWith([source]),
  });

  const result = await orchestrator.run({
    question: "Should we run the pilot?",
    userId: "user-1",
  });

  assert.deepEqual(result.brief.sources, [source]);
  assert.deepEqual(result.brief.reasons[0]?.citationKeys, ["R1"]);
  assert.deepEqual(repository.state.lastBrief?.sources, [source]);
});

test("unsupported citation is rejected and marks the run failed", async () => {
  const bad = analysis({
    reasons: [
      { citationKeys: ["R99"], id: "r1", kind: "fact", text: "Unsupported." },
      { citationKeys: [], id: "r2", kind: "inference", text: "Inference." },
      { citationKeys: [], id: "r3", kind: "inference", text: "Inference." },
    ],
  });
  const ai = new MockAiProvider([bad]);
  const { orchestrator, repository } = orchestratorFixture({ ai });

  await rejectsWithCode(
    orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" }),
    "unsupported_citation"
  );
  assert.equal(ai.calls.length, 1);
  assert.equal(repository.state.completeCalls, 0);
  assert.equal(repository.state.failCalls, 1);
  assert.equal(repository.state.lastFailCode, "unsupported_citation");
});

test("empty evidence deterministically lowers confidence and preserves unknowns", async () => {
  const noEvidenceAnalysis = analysis({
    confidence: { explanation: "Model confidence before policy.", level: "high" },
    reasons: [
      { citationKeys: [], id: "r1", kind: "inference", text: "Inference one." },
      { citationKeys: [], id: "r2", kind: "inference", text: "Inference two." },
      { citationKeys: [], id: "r3", kind: "inference", text: "Inference three." },
    ],
    unknowns: ["Market response is unknown."],
  });
  const ai = new MockAiProvider([noEvidenceAnalysis, ACCEPT_AUDIT]);
  const { orchestrator } = orchestratorFixture({ ai, provider: providerWith([]) });

  const result = await orchestrator.run({
    question: "Should we run the pilot?",
    userId: "user-1",
  });

  assert.equal(result.brief.confidence.level, "low");
  assert.ok(result.brief.unknowns.includes("Market response is unknown."));
  assert.ok(
    result.brief.unknowns.includes(
      "Insufficient retrieved evidence to support factual conclusions."
    )
  );
});

test("provider failure marks the run failed without model calls", async () => {
  const provider: EvidenceProvider = {
    id: "ragflow",
    async retrieve() {
      throw new EvidenceProviderError("ragflow", "provider_error");
    },
  };
  const ai = new MockAiProvider([]);
  const { orchestrator, repository } = orchestratorFixture({ ai, provider });

  await rejectsWithCode(
    orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" }),
    "evidence_provider_failed"
  );
  assert.equal(ai.calls.length, 0);
  assert.equal(repository.state.failCalls, 1);
});

test("invalid model output marks the run failed", async () => {
  const ai = new MockAiProvider([{ recommendation: "Incomplete" }]);
  const { orchestrator, repository } = orchestratorFixture({ ai });

  await rejectsWithCode(
    orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" }),
    "invalid_model_output"
  );
  assert.equal(repository.state.failCalls, 1);
  assert.equal(repository.state.completeCalls, 0);
});

test("abort propagates through retrieval and safely fails the created run", async () => {
  const provider: EvidenceProvider = {
    id: "ragflow",
    retrieve(_request, signal) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new EvidenceProviderError("ragflow", "aborted")),
          { once: true }
        );
      });
    },
  };
  const controller = new AbortController();
  const ai = new MockAiProvider([]);
  const { orchestrator, repository } = orchestratorFixture({ ai, provider });
  const pending = orchestrator.run({
    question: "Should we run the pilot?",
    signal: controller.signal,
    userId: "user-1",
  });
  setTimeout(() => controller.abort(new DOMException("Cancelled", "AbortError")), 0);

  await rejectsWithCode(pending, "aborted");
  assert.equal(repository.state.createCalls, 1);
  assert.equal(repository.state.failCalls, 1);
  assert.equal(repository.state.lastFailCode, "aborted");
});

test("completion persistence failure attempts failRun but preserves original error", async () => {
  const repo = repositoryMock({
    completeError: new Error("database write failed"),
    failError: new Error("terminal transition already won"),
  });
  const ai = new MockAiProvider([analysis(), ACCEPT_AUDIT]);
  const { orchestrator } = orchestratorFixture({ ai, repository: repo });

  await rejectsWithCode(
    orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" }),
    "persistence_failed"
  );
  assert.equal(repo.state.completeCalls, 1);
  assert.equal(repo.state.failCalls, 1);
});

test("snapshots capture initial/revised analysis, audit and evidence immutably", async () => {
  const revised = analysis({ confidence: { explanation: "Revised.", level: "medium" } });
  const audit: DecisionAudit = {
    decision: "revise",
    issues: ["Confidence too high."],
    revisionInstructions: ["Lower confidence."],
    verdict: "mixed",
  };
  const ai = new MockAiProvider([analysis(), audit, revised]);
  const { orchestrator, repository } = orchestratorFixture({ ai });

  await orchestrator.run({ question: "Should we run the pilot?", userId: "user-1" });

  assert.deepEqual(repository.state.lastCompleteAnalysis, {
    initial: analysis(),
    revised,
  });
  assert.deepEqual(repository.state.lastCompleteAudit, {
    audit,
    revisionApplied: true,
  });
  assert.ok(repository.state.lastEvidence);
  assert.equal(repository.state.lastCreate?.question, "Should we run the pilot?");
});
