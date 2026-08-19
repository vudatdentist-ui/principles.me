import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL?.trim();
if (!databaseUrl) {
  throw new Error("POSTGRES_URL is required for Judgment Loop verification.");
}

const sql = postgres(databaseUrl, { max: 1 });
let cleanupUserId = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const columns = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'Decision' AND column_name = 'principleCandidate')
        OR (table_name = 'Judgment' AND column_name = 'confidencePercent')
      )
  `;
  assert(columns.length === 2, "Missing Judgment Loop columns");

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PrincipleRevision'
  `;
  assert(tables.length === 1, "Missing PrincipleRevision table");

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'PrincipleRevision'
  `;
  const indexNames = new Set(indexes.map((row) => row.indexname));
  for (const required of [
    "PrincipleRevision_principle_idx",
    "PrincipleRevision_user_idx",
    "PrincipleRevision_principle_revision_unique",
  ]) {
    assert(indexNames.has(required), `Missing index: ${required}`);
  }

  const email = `judgment-loop-${Date.now()}@example.test`;
  const [owner] = await sql`
    INSERT INTO "User" ("email") VALUES (${email}) RETURNING "id"
  `;
  cleanupUserId = owner.id;

  const candidate = {
    basedOnJudgmentId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    rationale: "Candidate stays separate until explicit adoption.",
    statement: "Test before making an irreversible break.",
    status: "pending",
    updatedAt: new Date().toISOString(),
  };

  const [createdDecision] = await sql`
    INSERT INTO "Decision" ("userId", "title", "question", "principleCandidate")
    VALUES (${owner.id}, 'Judgment loop', 'Does the loop persist?', ${sql.json(candidate)})
    RETURNING "id", "principleCandidate"
  `;
  assert(
    createdDecision.principleCandidate.statement === candidate.statement,
    "principleCandidate JSON did not round-trip"
  );

  const [createdJudgment] = await sql`
    INSERT INTO "Judgment" ("decisionId", "userId", "summary", "confidencePercent")
    VALUES (${createdDecision.id}, ${owner.id}, 'Proceed conditionally.', 65)
    RETURNING "confidencePercent"
  `;
  assert(
    createdJudgment.confidencePercent === 65,
    "Confidence percent mismatch"
  );

  let rejectedOutOfRange = false;
  try {
    await sql`
      INSERT INTO "Judgment" ("decisionId", "userId", "summary", "confidencePercent")
      VALUES (${createdDecision.id}, ${owner.id}, 'Invalid confidence.', 101)
    `;
  } catch {
    rejectedOutOfRange = true;
  }
  assert(rejectedOutOfRange, "Database accepted confidencePercent > 100");

  const [createdPrinciple] = await sql`
    INSERT INTO "Principle" ("userId", "sourceDecisionId", "statement")
    VALUES (${owner.id}, ${createdDecision.id}, 'Keep reversible tests explicit.')
    RETURNING "id"
  `;
  await sql`
    INSERT INTO "PrincipleRevision" ("principleId", "userId", "revision", "statement")
    VALUES (${createdPrinciple.id}, ${owner.id}, 1, 'Keep reversible tests explicit.')
  `;
  const [revision] = await sql`
    SELECT "revision", "statement"
    FROM "PrincipleRevision"
    WHERE "principleId" = ${createdPrinciple.id}
  `;
  assert(revision.revision === 1, "Principle revision did not persist");

  await sql`DELETE FROM "User" WHERE "id" = ${owner.id}`;
  cleanupUserId = null;
  const remaining = await sql`
    SELECT count(*)::int AS count
    FROM "PrincipleRevision"
    WHERE "userId" = ${owner.id}
  `;
  assert(
    Number(remaining[0]?.count ?? 0) === 0,
    "Revision ownership cascade failed"
  );

  console.log("Judgment Loop schema verification passed.");
} finally {
  if (cleanupUserId) {
    await sql`DELETE FROM "User" WHERE "id" = ${cleanupUserId}`.catch(
      () => undefined
    );
  }
  await sql.end({ timeout: 5 });
}
