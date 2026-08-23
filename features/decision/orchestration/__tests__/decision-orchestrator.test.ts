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
import {
  DECISION_COUNCIL_LENSES,
  type DecisionAnalysis,
  type DecisionAudit,
  type DecisionCouncilLens,
  type DecisionFitAudit,
  type DecisionPerspective,
} from "../types";

const NOW = new Date("2026-08-21T12:00:00.000Z");
const QUESTION = "Should we run the pilot?";
const USER_ID = "user-1";

function evidence(key = "R1"): EvidenceReference {
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

function perspective(lens: DecisionCouncilLens): Omit<DecisionPerspective, "lens"> {
  return {
    considerations: [
      `${lens} consideration one.`,
      `${lens} consideration two.`,
    ],
    position: `${lens} position.`,
    risks: [`${lens} risk.`],
    unknowns: [`${lens} unknown.`],
  };
}

function councilOutputs(): Omit<DecisionPerspective, "lens">[] {
  return DECISION_COUNCIL_LENSES.map((lens) => perspective(lens));
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

const ACCEPT_EVIDENCE_AUDIT: DecisionAudit = {
  decision: "accept",
  issues: [],
  revisionInstructions: [],
  verdict: "grounded",
};

const ACCEPT_FIT_AUDIT: DecisionFitAudit = {
  decision: "accept",
  issues: [],
  revisionInstructions: [],
  verdict: "fit",
};

function happyQueue(synthesized = analysis()): unknown[] {
  return [
    ...councilOutputs(),
    synthesized,
    ACCEPT_EVIDENCE_AUDIT,
    ACCEPT_FIT_AUDIT,
  ];
}

class MockAiProvider implements AiProvider {
  readonly calls: GenerateObjectRequest<unknown>[] = [];
  readonly id = "mock-ai";
  private readonly queue: unknown[];

  constructor(queue: unknown[]) {
    this.queue = queue;
  }

  generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    this.calls.push(request as GenerateObjectRequest<unknown>);
    const value = this.queue.shift();
    if (value instanceof Error) {
      return Promise.reject(value);
    }
    try {
      return Promise.resolve(request.parse(value));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  generateText(): Promise<string> {
    return Promise.reject(new Error("Unexpected text generation call."));
  }

  streamText(): AsyncIterable<string> {
    const error = new Error("Unexpected streaming call.");
    return {
      [Symbol.asyncIterator]() {
        return { next: () => Promise.reject(error) };
      },
    };
  }
}

type RepositoryState = {
  completeCalls: number;
  createCalls: number;
  failCalls: number;
  lastAnalysis: JsonSnapshot | null;
  lastAudit: JsonSnapshot | null;
  lastBrief: DecisionBrief | null;
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

function repositoryMock(options: { completeError?: Error; failError?: Error } = {}) {
  const state: RepositoryState = {
    completeCalls: 0,
    createCalls: 0,
    failCalls: 0,
    lastAnalysis: null,
    lastAudit: null,
    lastBrief: null,
    lastCreate: null,
    lastEvidence: null,
    lastFailCode: null,
  };

  const repository: DecisionRepository = {
    completeRun(input) {
      state.completeCalls += 1;
      state.lastAnalysis = input.analysisSnapshot;
      state.lastAudit = input.auditSnapshot;
      state.lastBrief = input.decisionBrief;
      state.lastEvidence = input.evidenceSnapshot;
      if (options.completeError) {
        return Promise.reject(options.completeError);
      }
      if (!state.lastCreate) {
        return Promise.reject(new Error("createRun was not called."));
      }
      return Promise.resolve(makeRun(state.lastCreate, input.decisionBrief));
    },
    createDecision() {
      return Promise.reject(new Error("createDecision must not be called."));
    },
    createRun(input) {
      state.createCalls += 1;
      state.lastCreate = input;
      return Promise.resolve(makeRun(input, null));
    },
    failRun(input) {
      state.failCalls += 1;
      state.lastFailCode = input.errorCode;
      return options.failError ? Promise.reject(options.failError) : Promise.resolve();
    },
    getDecision() {
      return Promise.resolve(null);
    },
    getRun() {
      return Promise.resolve(null);
    },
    listDueForReview() {
      return Promise.resolve([]);
    },
    listRecent() {
      return Promise.resolve([]);
    },
  };

  return { repository, state };
}

function providerWith(references: readonly EvidenceReference[]): EvidenceProvider {
  return {
    id: "ragflow",
    retrieve() {
      return Promise.resolve({
        references: [...references],
        retrievedAt: NOW.toISOString(),
      });
    },
  };
}

function fixture(input: {
  ai: MockAiProvider;
  provider?: EvidenceProvider;
  repository?: ReturnType<typeof repositoryMock>;
}) {
  const repository = input.repository ?? repositoryMock();
  return {
    orchestrator: createDecisionOrchestrator({
      aiProvider: input.ai,
      evidenceProviders: [input.provider ?? providerWith([evidence()])],
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
    assert.ok(error instanceof DecisionOrchestratorError);
    assert.equal(error.code, code);
    return true;
  });
}

function run(
  orchestrator: ReturnType<typeof createDecisionOrchestrator>,
  signal?: AbortSignal
) {
  return orchestrator.run({ question: QUESTION, signal, userId: USER_ID });
}

function requestText(request: GenerateObjectRequest<unknown>): string {
  return request.messages.map((message) => message.content).join("\n");
}

function callAt(ai: MockAiProvider, index: number): GenerateObjectRequest<unknown> {
  const call = ai.calls[index];
  assert.ok(call, `Expected model call ${index + 1}.`);
  return call;
}

test("happy path runs four independent reasoners, synthesis and two audits", async () => {
  const ai = new MockAiProvider(happyQueue());
  const { orchestrator, repository } = fixture({ ai });
  const stages: string[] = [];

  const result = await orchestrator.run({
    onProgress: ({ stage }) => {
      stages.push(stage);
    },
    question: QUESTION,
    userId: USER_ID,
  });

  assert.equal(ai.calls.length, 7);
  assert.equal(result.revisionApplied, false);
  assert.equal(repository.state.completeCalls, 1);
  assert.equal(repository.state.failCalls, 0);
  assert.deepEqual(stages, ["context", "retrieval", "analysis", "audit", "persistence"]);
});

test("reasoners have isolated prompts and auditors receive separated context", async () => {
  const ai = new MockAiProvider(happyQueue());
  const { orchestrator } = fixture({ ai });

  await orchestrator.run({
    context: { goal: "Protect downside before scaling." },
    question: QUESTION,
    userId: USER_ID,
  });

  const reasonerCalls = ai.calls.slice(0, 4);
  assert.equal(reasonerCalls.length, 4);
  for (const call of reasonerCalls) {
    const text = requestText(call);
    assert.match(text, /same question, user context, and evidence/i);
    assert.doesNotMatch(text, /INDEPENDENT PERSPECTIVES:/);
    for (const lens of DECISION_COUNCIL_LENSES) {
      assert.doesNotMatch(text, new RegExp(`${lens} position\\.`));
    }
  }

  const synthesisText = requestText(callAt(ai, 4));
  for (const lens of DECISION_COUNCIL_LENSES) {
    assert.match(synthesisText, new RegExp(`${lens} position\\.`));
  }

  const evidenceAuditText = requestText(callAt(ai, 5));
  assert.doesNotMatch(evidenceAuditText, /CONTEXT SNAPSHOT:/);
  assert.doesNotMatch(evidenceAuditText, /Protect downside before scaling/);

  const fitAuditText = requestText(callAt(ai, 6));
  assert.match(fitAuditText, /CONTEXT SNAPSHOT:/);
  assert.match(fitAuditText, /Protect downside before scaling/);
});

test("decision-fit audit can trigger exactly one revision", async () => {
  const revised = analysis({ recommendation: "Proceed after one safeguard." });
  const fitAudit: DecisionFitAudit = {
    decision: "revise",
    issues: ["The next step commits too much capital."],
    revisionInstructions: ["Make the next step more reversible."],
    verdict: "mixed",
  };
  const ai = new MockAiProvider([
    ...councilOutputs(),
    analysis(),
    ACCEPT_EVIDENCE_AUDIT,
    fitAudit,
    revised,
    new Error("A ninth call must never occur."),
  ]);
  const { orchestrator } = fixture({ ai });

  const result = await run(orchestrator);

  assert.equal(ai.calls.length, 8);
  assert.equal(result.revisionApplied, true);
  assert.equal(result.brief.recommendation, revised.recommendation);
  const revisionText = requestText(callAt(ai, 7));
  assert.match(revisionText, /EVIDENCE AUDIT:/);
  assert.match(revisionText, /DECISION-FIT AUDIT:/);
  assert.match(revisionText, /INDEPENDENT PERSPECTIVES:/);
});

test("retrieved evidence and citation keys are preserved in the brief", async () => {
  const source = evidence();
  const ai = new MockAiProvider(happyQueue());
  const { orchestrator, repository } = fixture({ ai, provider: providerWith([source]) });

  const result = await run(orchestrator);

  assert.deepEqual(result.brief.sources, [source]);
  assert.deepEqual(result.brief.reasons[0]?.citationKeys, ["R1"]);
  assert.deepEqual(repository.state.lastBrief?.sources, [source]);
});

test("unsupported synthesized citation is rejected before audits", async () => {
  const bad = analysis({
    reasons: [
      { citationKeys: ["R99"], id: "r1", kind: "fact", text: "Unsupported." },
      { citationKeys: [], id: "r2", kind: "inference", text: "Inference." },
      { citationKeys: [], id: "r3", kind: "inference", text: "Inference." },
    ],
  });
  const ai = new MockAiProvider([...councilOutputs(), bad]);
  const { orchestrator, repository } = fixture({ ai });

  await rejectsWithCode(run(orchestrator), "unsupported_citation");
  assert.equal(ai.calls.length, 5);
  assert.equal(repository.state.completeCalls, 0);
  assert.equal(repository.state.lastFailCode, "unsupported_citation");
});

test("empty evidence lowers synthesized confidence and preserves unknowns", async () => {
  const noEvidence = analysis({
    confidence: { explanation: "Model confidence before policy.", level: "high" },
    reasons: [
      { citationKeys: [], id: "r1", kind: "inference", text: "Inference one." },
      { citationKeys: [], id: "r2", kind: "inference", text: "Inference two." },
      { citationKeys: [], id: "r3", kind: "inference", text: "Inference three." },
    ],
    unknowns: ["Market response is unknown."],
  });
  const ai = new MockAiProvider(happyQueue(noEvidence));
  const { orchestrator } = fixture({ ai, provider: providerWith([]) });

  const result = await run(orchestrator);

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
    retrieve() {
      return Promise.reject(new EvidenceProviderError("ragflow", "provider_error"));
    },
  };
  const ai = new MockAiProvider([]);
  const { orchestrator, repository } = fixture({ ai, provider });

  await rejectsWithCode(run(orchestrator), "evidence_provider_failed");
  assert.equal(ai.calls.length, 0);
  assert.equal(repository.state.failCalls, 1);
});

test("invalid perspective output marks the run failed before synthesis", async () => {
  const ai = new MockAiProvider([
    { position: "Incomplete" },
    perspective("risk-inversion"),
    perspective("systems"),
    perspective("action"),
  ]);
  const { orchestrator, repository } = fixture({ ai });

  await rejectsWithCode(run(orchestrator), "invalid_model_output");
  assert.equal(ai.calls.length, 4);
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
  const { orchestrator, repository } = fixture({ ai, provider });
  const pending = run(orchestrator, controller.signal);
  setTimeout(() => controller.abort(new DOMException("Cancelled", "AbortError")), 0);

  await rejectsWithCode(pending, "aborted");
  assert.equal(repository.state.createCalls, 1);
  assert.equal(repository.state.lastFailCode, "aborted");
});

test("completion persistence failure attempts failRun but preserves original error", async () => {
  const repository = repositoryMock({
    completeError: new Error("database write failed"),
    failError: new Error("terminal transition already won"),
  });
  const ai = new MockAiProvider(happyQueue());
  const { orchestrator } = fixture({ ai, repository });

  await rejectsWithCode(run(orchestrator), "persistence_failed");
  assert.equal(repository.state.completeCalls, 1);
  assert.equal(repository.state.failCalls, 1);
});

test("snapshots capture council, synthesis, dual audits and revision", async () => {
  const initial = analysis();
  const revised = analysis({ confidence: { explanation: "Revised.", level: "medium" } });
  const evidenceAudit: DecisionAudit = {
    decision: "revise",
    issues: ["Confidence too high."],
    revisionInstructions: ["Lower confidence."],
    verdict: "mixed",
  };
  const ai = new MockAiProvider([
    ...councilOutputs(),
    initial,
    evidenceAudit,
    ACCEPT_FIT_AUDIT,
    revised,
  ]);
  const { orchestrator, repository } = fixture({ ai });

  await run(orchestrator);

  const expectedCouncil = DECISION_COUNCIL_LENSES.map((lens) => ({
    ...perspective(lens),
    lens,
  }));
  assert.deepEqual(repository.state.lastAnalysis, {
    council: expectedCouncil,
    initial,
    revised,
  });
  assert.deepEqual(repository.state.lastAudit, {
    audit: evidenceAudit,
    decisionFitAudit: ACCEPT_FIT_AUDIT,
    revisionApplied: true,
  });
  assert.ok(repository.state.lastEvidence);
  assert.equal(repository.state.lastCreate?.question, QUESTION);
});
