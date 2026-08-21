import assert from "node:assert/strict";
import test from "node:test";
import type {
  DecisionDetail,
  DecisionRepository,
  DecisionRun,
  DecisionSummary,
  PersistedDecision,
  PersistedDecisionOutcome,
  PersistedPrinciple,
} from "../../../decision/persistence/types";
import type {
  PersistedAssumptionReview,
  PersistedPrincipleReview,
  ReviewRepository,
} from "../../persistence/types";
import { acceptDecision } from "../accept-decision";
import { suggestPrincipleCandidate } from "../principle-candidate";
import {
  getReviewContext,
  markDecisionReviewed,
  recordOutcome,
  reviewAssumption,
  reviewPrinciple,
} from "../review-decision";

const userA = "user-a";
const userB = "user-b";
const now = new Date("2026-08-21T10:00:00.000Z");

function makeRun(
  overrides: Partial<DecisionRun> = {}
): DecisionRun {
  return {
    analysisSnapshot: {},
    auditSnapshot: {},
    completedAt: now,
    contextSnapshot: {},
    decisionBrief: { id: "brief-1", runId: "run-1" } as unknown as DecisionRun["decisionBrief"],
    decisionId: null,
    errorCode: null,
    evidenceSnapshot: {},
    failedAt: null,
    id: "run-1",
    model: "test-model",
    promptVersion: "test-prompt",
    question: "Should we proceed?",
    retrievalPlan: {},
    startedAt: now,
    userId: userA,
    ...overrides,
  };
}

function makeDecision(
  id: string,
  userId = userA,
  overrides: Partial<PersistedDecision> = {}
): PersistedDecision {
  return {
    createdAt: now,
    decidedAt: now,
    id,
    objective: null,
    question: `Question ${id}`,
    reviewAt: null,
    reviewedAt: null,
    status: "decided",
    title: `Decision ${id}`,
    updatedAt: now,
    userId,
    ...overrides,
  };
}

function makeOutcome(
  id: string,
  decisionId: string,
  userId = userA,
  lessons: string | null = null
): PersistedDecisionOutcome {
  return {
    createdAt: now,
    decisionId,
    decisionQuality: "yes",
    id,
    lessons,
    reasoningQuality: "yes",
    result: `Result ${id}`,
    updatedAt: now,
    userId,
    verdict: "positive",
  };
}

function makePrinciple(
  id: string,
  userId = userA
): PersistedPrinciple {
  return {
    createdAt: now,
    description: null,
    id,
    revision: 3,
    sourceDecisionId: null,
    statement: "Preserve optionality when uncertainty is high.",
    status: "active",
    updatedAt: now,
    userId,
  };
}

function makeDetail(
  decision: PersistedDecision,
  outcomes: readonly PersistedDecisionOutcome[] = [],
  principles: readonly PersistedPrinciple[] = []
): DecisionDetail {
  return {
    decision,
    outcomes,
    principles,
    run: null,
  };
}

function unusedPromise(): Promise<never> {
  return Promise.reject(new Error("unused test dependency"));
}

function makeDecisionRepository(input: {
  readonly details?: ReadonlyMap<string, DecisionDetail>;
  readonly onCreateDecision?: DecisionRepository["createDecision"];
  readonly recent?: readonly DecisionSummary[];
  readonly runs?: ReadonlyMap<string, DecisionRun>;
} = {}): DecisionRepository {
  const details = input.details ?? new Map<string, DecisionDetail>();
  const runs = input.runs ?? new Map<string, DecisionRun>();

  return {
    completeRun: unusedPromise,
    createDecision:
      input.onCreateDecision ?? (() => unusedPromise()),
    createRun: unusedPromise,
    failRun: () => Promise.resolve(),
    getDecision: (id, userId) => {
      const detail = details.get(id);
      return Promise.resolve(
        detail?.decision.userId === userId ? detail : null
      );
    },
    getRun: (id, userId) => {
      const run = runs.get(id);
      return Promise.resolve(run?.userId === userId ? run : null);
    },
    listDueForReview: () => Promise.resolve([]),
    listRecent: (userId, limit) =>
      Promise.resolve(
        (input.recent ?? [])
          .filter((decision) => {
            const detail = details.get(decision.id);
            return detail?.decision.userId === userId;
          })
          .slice(0, limit)
      ),
  };
}

function makeReviewRepository(input: {
  readonly onCreateAssumptionReview?: ReviewRepository["createAssumptionReview"];
  readonly onCreateOutcome?: ReviewRepository["createOutcome"];
  readonly onCreatePrincipleReview?: ReviewRepository["createPrincipleReview"];
  readonly onMarkDecisionReviewed?: ReviewRepository["markDecisionReviewed"];
} = {}): ReviewRepository {
  return {
    createAssumptionReview:
      input.onCreateAssumptionReview ?? (() => Promise.resolve(null)),
    createOutcome: input.onCreateOutcome ?? (() => Promise.resolve(null)),
    createPrincipleReview:
      input.onCreatePrincipleReview ?? (() => Promise.resolve(null)),
    listOutcomes: () => Promise.resolve([]),
    markDecisionReviewed:
      input.onMarkDecisionReviewed ?? (() => Promise.resolve(false)),
  };
}

test("accepts a completed run and repeated acceptance delegates idempotently", async () => {
  const run = makeRun();
  const decision = makeDecision("decision-1");
  let createCalls = 0;
  const decisionRepository = makeDecisionRepository({
    onCreateDecision: () => {
      createCalls += 1;
      return Promise.resolve(decision);
    },
    runs: new Map([[run.id, run]]),
  });

  const first = await acceptDecision(
    { runId: run.id, userId: userA },
    { decisionRepository }
  );
  const second = await acceptDecision(
    { runId: run.id, userId: userA },
    { decisionRepository }
  );

  assert.deepEqual(first, {
    ok: true,
    value: {
      decisionId: decision.id,
      reviewAt: null,
      runId: run.id,
      status: "decided",
    },
  });
  assert.deepEqual(second, first);
  assert.equal(createCalls, 2);
});

test("failed or incomplete runs cannot be accepted", async () => {
  for (const run of [
    makeRun({ completedAt: null }),
    makeRun({ failedAt: now }),
    makeRun({ decisionBrief: null }),
  ]) {
    const decisionRepository = makeDecisionRepository({
      runs: new Map([[run.id, run]]),
    });
    const result = await acceptDecision(
      { runId: run.id, userId: userA },
      { decisionRepository }
    );

    assert.deepEqual(result, {
      error: { code: "run_not_complete" },
      ok: false,
    });
  }
});

test("another tenant cannot accept, read, or record a review", async () => {
  const run = makeRun();
  const decision = makeDecision("decision-1");
  const detail = makeDetail(decision);
  const decisionRepository = makeDecisionRepository({
    details: new Map([[decision.id, detail]]),
    runs: new Map([[run.id, run]]),
  });
  const reviewRepository = makeReviewRepository();

  const accepted = await acceptDecision(
    { runId: run.id, userId: userB },
    { decisionRepository }
  );
  const context = await getReviewContext(
    { decisionId: decision.id, userId: userB },
    { decisionRepository }
  );
  const outcome = await recordOutcome(
    { decisionId: decision.id, result: "No access", userId: userB },
    { decisionRepository, reviewRepository }
  );

  assert.deepEqual(accepted, { error: { code: "not_found" }, ok: false });
  assert.deepEqual(context, { error: { code: "not_found" }, ok: false });
  assert.deepEqual(outcome, { error: { code: "not_found" }, ok: false });
});

test("records an outcome for an owned decision and exposes review context", async () => {
  const decision = makeDecision("decision-1");
  const principle = makePrinciple("principle-1");
  const createdOutcome = makeOutcome(
    "outcome-1",
    decision.id,
    userA,
    "Preserve optionality when uncertainty is high."
  );
  const capturedOutcomes: Parameters<ReviewRepository["createOutcome"]>[0][] = [];
  const decisionRepository = makeDecisionRepository({
    details: new Map([
      [decision.id, makeDetail(decision, [createdOutcome], [principle])],
    ]),
  });
  const reviewRepository = makeReviewRepository({
    onCreateOutcome: (input) => {
      capturedOutcomes.push(input);
      return Promise.resolve(createdOutcome);
    },
  });

  const recorded = await recordOutcome(
    {
      decisionId: decision.id,
      lessons: createdOutcome.lessons,
      result: createdOutcome.result,
      userId: userA,
      verdict: "positive",
    },
    { decisionRepository, reviewRepository }
  );
  const context = await getReviewContext(
    { decisionId: decision.id, userId: userA },
    { decisionRepository }
  );

  assert.equal(recorded.ok, true);
  const capturedOutcome = capturedOutcomes[0];
  assert.equal(capturedOutcome?.decisionId, decision.id);
  assert.equal(capturedOutcome?.lessons, createdOutcome.lessons);
  assert.equal(capturedOutcome?.result, createdOutcome.result);
  assert.equal(capturedOutcome?.userId, userA);
  assert.equal(capturedOutcome?.verdict, "positive");
  assert.equal(context.ok, true);
  if (context.ok) {
    assert.equal(context.value.outcomes[0]?.id, createdOutcome.id);
    assert.equal(context.value.linkedPrinciples[0]?.id, principle.id);
  }
});

test("records an assumption review only after validating the owned outcome", async () => {
  const decision = makeDecision("decision-1");
  const outcome = makeOutcome("outcome-1", decision.id);
  const persistedReview: PersistedAssumptionReview = {
    assumptionText: "Demand remains stable",
    createdAt: now,
    decisionId: decision.id,
    id: "assumption-review-1",
    note: null,
    outcomeId: outcome.id,
    updatedAt: now,
    userId: userA,
    verdict: "correct",
  };
  const decisionRepository = makeDecisionRepository({
    details: new Map([[decision.id, makeDetail(decision, [outcome])]]),
  });
  const reviewRepository = makeReviewRepository({
    onCreateAssumptionReview: () => Promise.resolve(persistedReview),
  });

  const result = await reviewAssumption(
    {
      assumptionText: persistedReview.assumptionText,
      decisionId: decision.id,
      outcomeId: outcome.id,
      userId: userA,
      verdict: persistedReview.verdict,
    },
    { decisionRepository, reviewRepository }
  );

  assert.deepEqual(result, { ok: true, value: persistedReview });
});

test("assumption review requires the outcome to belong to the decision and user", async () => {
  const decision = makeDecision("decision-1");
  const foreignOutcome = makeOutcome("outcome-2", "decision-2");
  const decisionRepository = makeDecisionRepository({
    details: new Map([
      [decision.id, makeDetail(decision, [foreignOutcome])],
    ]),
  });
  const reviewRepository = makeReviewRepository();

  const result = await reviewAssumption(
    {
      assumptionText: "Demand remains stable",
      decisionId: decision.id,
      outcomeId: foreignOutcome.id,
      userId: userA,
      verdict: "incorrect",
    },
    { decisionRepository, reviewRepository }
  );

  assert.deepEqual(result, {
    error: { code: "invalid_review_relationship" },
    ok: false,
  });
});

test("principle review requires a real DecisionPrinciple link and snapshots persisted principle state", async () => {
  const decision = makeDecision("decision-1");
  const outcome = makeOutcome("outcome-1", decision.id);
  const principle = makePrinciple("principle-1");
  const unlinkedRepository = makeDecisionRepository({
    details: new Map([[decision.id, makeDetail(decision, [outcome])]]),
  });
  const reviewRepository = makeReviewRepository();

  const unlinked = await reviewPrinciple(
    {
      action: "keep",
      decisionId: decision.id,
      outcomeId: outcome.id,
      principleId: principle.id,
      userId: userA,
    },
    { decisionRepository: unlinkedRepository, reviewRepository }
  );
  assert.deepEqual(unlinked, {
    error: { code: "invalid_review_relationship" },
    ok: false,
  });

  let capturedReview: Parameters<ReviewRepository["createPrincipleReview"]>[0] | null = null;
  const linkedReview: PersistedPrincipleReview = {
    action: "revise",
    createdAt: now,
    decisionId: decision.id,
    id: "principle-review-1",
    outcomeId: outcome.id,
    previousRevision: principle.revision,
    previousStatement: principle.statement,
    principleId: principle.id,
    resultingRevision: principle.revision + 1,
    resultingStatement: "Preserve optionality under material uncertainty.",
    userId: userA,
  };
  const linkedRepository = makeDecisionRepository({
    details: new Map([
      [decision.id, makeDetail(decision, [outcome], [principle])],
    ]),
  });
  const linkedReviewRepository = makeReviewRepository({
    onCreatePrincipleReview: (input) => {
      capturedReview = input;
      return Promise.resolve(linkedReview);
    },
  });

  const linked = await reviewPrinciple(
    {
      action: "revise",
      decisionId: decision.id,
      outcomeId: outcome.id,
      principleId: principle.id,
      resultingStatement: "  Preserve optionality under material uncertainty.  ",
      userId: userA,
    },
    {
      decisionRepository: linkedRepository,
      reviewRepository: linkedReviewRepository,
    }
  );

  assert.equal(linked.ok, true);
  assert.deepEqual(capturedReview, {
    action: "revise",
    decisionId: decision.id,
    outcomeId: outcome.id,
    previousRevision: principle.revision,
    previousStatement: principle.statement,
    principleId: principle.id,
    resultingRevision: principle.revision + 1,
    resultingStatement: "Preserve optionality under material uncertainty.",
    userId: userA,
  });
});

test("marks an owned decision reviewed with an explicit timestamp", async () => {
  const decision = makeDecision("decision-1");
  const decisionRepository = makeDecisionRepository({
    details: new Map([[decision.id, makeDetail(decision)]]),
  });
  let markedAt: Date | undefined;
  const reviewRepository = makeReviewRepository({
    onMarkDecisionReviewed: (_decisionId, _userId, reviewedAt) => {
      markedAt = reviewedAt;
      return Promise.resolve(true);
    },
  });

  const result = await markDecisionReviewed(
    { decisionId: decision.id, reviewedAt: now, userId: userA },
    { decisionRepository, reviewRepository }
  );

  assert.deepEqual(result, {
    ok: true,
    value: { decisionId: decision.id, reviewedAt: now },
  });
  assert.equal(markedAt, now);
});

test("candidate suggestion reads reviewed persisted outcomes and performs no writes", async () => {
  const decisionOne = makeDecision("decision-1", userA, {
    reviewedAt: now,
    status: "reviewed",
  });
  const decisionTwo = makeDecision("decision-2", userA, {
    reviewedAt: now,
    status: "reviewed",
  });
  const outcomeOne = makeOutcome(
    "outcome-1",
    decisionOne.id,
    userA,
    "Preserve optionality when uncertainty is high."
  );
  const outcomeTwo = makeOutcome(
    "outcome-2",
    decisionTwo.id,
    userA,
    " preserve OPTIONALITY, when uncertainty is high "
  );
  const details = new Map<string, DecisionDetail>([
    [decisionOne.id, makeDetail(decisionOne, [outcomeOne])],
    [decisionTwo.id, makeDetail(decisionTwo, [outcomeTwo])],
  ]);
  let writeCalls = 0;
  const decisionRepository = makeDecisionRepository({
    details,
    onCreateDecision: () => {
      writeCalls += 1;
      return unusedPromise();
    },
    recent: [decisionOne, decisionTwo],
  });

  const result = await suggestPrincipleCandidate(
    {
      decisionId: decisionOne.id,
      outcomeId: outcomeOne.id,
      userId: userA,
    },
    { decisionRepository }
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.supportingDecisionIds, [
      decisionOne.id,
      decisionTwo.id,
    ]);
    assert.deepEqual(result.value.supportingOutcomeIds, [
      outcomeOne.id,
      outcomeTwo.id,
    ]);
  }
  assert.equal(writeCalls, 0);
});
