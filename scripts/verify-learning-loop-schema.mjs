import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL?.trim();
if (!databaseUrl) {
  throw new Error("POSTGRES_URL is required for Learning Loop verification.");
}

const sql = postgres(databaseUrl, { max: 1 });
let cleanupUserId = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('DecisionAssumptionReview', 'DecisionPrincipleReview')
  `;
  assert(tables.length === 2, "Missing Learning Loop review tables");

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DecisionOutcome'
      AND column_name IN ('decisionQuality', 'reasoningQuality')
  `;
  assert(
    columns.length === 2,
    "Missing DecisionOutcome review quality columns"
  );

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'Decision_user_review_idx',
        'DecisionAssumptionReview_outcome_idx',
        'DecisionPrincipleReview_outcome_idx'
      )
  `;
  assert(indexes.length === 3, "Missing Learning Loop indexes");

  const email = `learning-loop-${Date.now()}@example.test`;
  const [owner] = await sql`
    INSERT INTO "User" ("email") VALUES (${email}) RETURNING "id"
  `;
  cleanupUserId = owner.id;

  const reviewAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [createdDecision] = await sql`
    INSERT INTO "Decision" ("userId", "title", "question", "reviewAt", "status")
    VALUES (${owner.id}, 'Learning loop', 'Did reality match the assumptions?', ${reviewAt}, 'decided')
    RETURNING "id", "reviewAt"
  `;
  assert(createdDecision.reviewAt, "reviewAt did not persist");

  const [createdPrinciple] = await sql`
    INSERT INTO "Principle" ("userId", "sourceDecisionId", "statement")
    VALUES (${owner.id}, ${createdDecision.id}, 'Use reversible tests before irreversible commitments.')
    RETURNING "id", "revision", "statement"
  `;
  await sql`
    INSERT INTO "DecisionPrinciple" ("decisionId", "principleId", "userId", "relation")
    VALUES (${createdDecision.id}, ${createdPrinciple.id}, ${owner.id}, 'adopted')
  `;

  const [outcome] = await sql`
    INSERT INTO "DecisionOutcome" (
      "decisionId", "userId", "result", "verdict", "decisionQuality", "reasoningQuality"
    ) VALUES (
      ${createdDecision.id}, ${owner.id}, 'The test exposed the key risk.', 'mixed', 'yes', 'partially'
    )
    RETURNING "id", "decisionQuality", "reasoningQuality"
  `;
  assert(outcome.decisionQuality === "yes", "Decision quality did not persist");
  assert(
    outcome.reasoningQuality === "partially",
    "Reasoning quality did not persist"
  );

  const [assumptionReview] = await sql`
    INSERT INTO "DecisionAssumptionReview" (
      "outcomeId", "decisionId", "userId", "assumptionText", "verdict", "note"
    ) VALUES (
      ${outcome.id}, ${createdDecision.id}, ${owner.id},
      'Conflict avoidance is correctable.', 'incorrect', 'Behavior did not change.'
    )
    RETURNING "verdict"
  `;
  assert(
    assumptionReview.verdict === "incorrect",
    "Assumption review did not persist"
  );

  const [principleReview] = await sql`
    INSERT INTO "DecisionPrincipleReview" (
      "outcomeId", "decisionId", "principleId", "userId", "action",
      "previousRevision", "resultingRevision", "previousStatement", "resultingStatement"
    ) VALUES (
      ${outcome.id}, ${createdDecision.id}, ${createdPrinciple.id}, ${owner.id}, 'keep',
      ${createdPrinciple.revision}, ${createdPrinciple.revision},
      ${createdPrinciple.statement}, ${createdPrinciple.statement}
    )
    RETURNING "action"
  `;
  assert(principleReview.action === "keep", "Principle review did not persist");

  await sql`DELETE FROM "User" WHERE "id" = ${owner.id}`;
  cleanupUserId = null;
  const [remaining] = await sql`
    SELECT
      (SELECT count(*)::int FROM "DecisionAssumptionReview" WHERE "userId" = ${owner.id}) AS assumptions,
      (SELECT count(*)::int FROM "DecisionPrincipleReview" WHERE "userId" = ${owner.id}) AS principles
  `;
  assert(
    Number(remaining.assumptions) === 0,
    "Assumption review cascade failed"
  );
  assert(
    Number(remaining.principles) === 0,
    "Principle review cascade failed"
  );

  console.log("Learning Loop schema verification passed.");
} finally {
  if (cleanupUserId) {
    await sql`DELETE FROM "User" WHERE "id" = ${cleanupUserId}`.catch(
      () => undefined
    );
  }
  await sql.end({ timeout: 5 });
}
