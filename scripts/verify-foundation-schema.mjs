import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL?.trim();
if (!databaseUrl) {
  throw new Error("POSTGRES_URL is required for schema verification.");
}

const sql = postgres(databaseUrl, { max: 1 });
const requiredTables = [
  "Decision",
  "Judgment",
  "Principle",
  "DecisionPrinciple",
  "DecisionOutcome",
];
const requiredEnums = {
  decision_outcome_verdict: ["positive", "mixed", "negative", "too_early"],
  decision_principle_relation: [
    "suggested",
    "applied",
    "challenged",
    "created",
    "adopted",
  ],
  decision_status: [
    "draft",
    "exploring",
    "decided",
    "review_due",
    "reviewed",
    "archived",
  ],
  judgment_confidence: ["low", "medium", "high"],
  principle_status: ["active", "revised", "retired"],
};
const requiredIndexes = [
  "Decision_user_idx",
  "Decision_user_status_idx",
  "Judgment_decision_idx",
  "Judgment_user_idx",
  "Principle_source_decision_idx",
  "Principle_user_status_idx",
  "DecisionPrinciple_principle_idx",
  "DecisionPrinciple_user_idx",
  "DecisionOutcome_decision_idx",
  "DecisionOutcome_user_idx",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function count(table, column, value) {
  const rows = await sql.unsafe(
    `SELECT count(*)::int AS count FROM "${table}" WHERE "${column}" = $1`,
    [value]
  );
  return Number(rows[0]?.count ?? 0);
}

let cleanupUserId = null;
try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const tableNames = new Set(tables.map((row) => row.table_name));
  for (const table of requiredTables) {
    assert(tableNames.has(table), `Missing migrated table: ${table}`);
  }

  const enumRows = await sql`
    SELECT t.typname AS name, e.enumlabel AS value, e.enumsortorder AS position
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `;
  for (const [name, expected] of Object.entries(requiredEnums)) {
    const actual = enumRows
      .filter((row) => row.name === name)
      .map((row) => row.value);
    assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `Enum ${name} mismatch: expected ${expected.join(", ")}; got ${actual.join(", ")}`
    );
  }

  const indexRows = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;
  const indexNames = new Set(indexRows.map((row) => row.indexname));
  for (const index of requiredIndexes) {
    assert(indexNames.has(index), `Missing domain index: ${index}`);
  }

  const email = `foundation-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const [owner] = await sql`
    INSERT INTO "User" ("email") VALUES (${email}) RETURNING "id"
  `;
  cleanupUserId = owner.id;

  const [decision] = await sql`
    INSERT INTO "Decision" ("userId", "title", "question", "status")
    VALUES (${owner.id}, 'Foundation decision', 'Does the domain schema work?', 'exploring')
    RETURNING "id"
  `;
  const [judgment] = await sql`
    INSERT INTO "Judgment" ("decisionId", "userId", "summary", "confidence")
    VALUES (${decision.id}, ${owner.id}, 'The schema should enforce ownership and lifecycle.', 'high')
    RETURNING "id"
  `;
  const [principle] = await sql`
    INSERT INTO "Principle" ("userId", "sourceDecisionId", "statement", "revision", "status")
    VALUES (${owner.id}, ${decision.id}, 'Verify foundations before feature work.', 1, 'active')
    RETURNING "id"
  `;
  await sql`
    INSERT INTO "DecisionPrinciple" ("decisionId", "principleId", "userId", "relation")
    VALUES (${decision.id}, ${principle.id}, ${owner.id}, 'created')
  `;
  const [outcome] = await sql`
    INSERT INTO "DecisionOutcome" ("decisionId", "userId", "result", "verdict")
    VALUES (${decision.id}, ${owner.id}, 'Schema verification executed.', 'positive')
    RETURNING "id"
  `;

  await sql`DELETE FROM "Decision" WHERE "id" = ${decision.id}`;
  assert(
    (await count("Judgment", "id", judgment.id)) === 0,
    "Judgment did not cascade with Decision deletion"
  );
  assert(
    (await count("DecisionOutcome", "id", outcome.id)) === 0,
    "DecisionOutcome did not cascade with Decision deletion"
  );
  assert(
    (await count("DecisionPrinciple", "decisionId", decision.id)) === 0,
    "DecisionPrinciple did not cascade with Decision deletion"
  );

  const [principleAfterDecisionDelete] = await sql`
    SELECT "sourceDecisionId" FROM "Principle" WHERE "id" = ${principle.id}
  `;
  assert(
    Boolean(principleAfterDecisionDelete),
    "Principle should survive deletion of its source Decision"
  );
  assert(
    principleAfterDecisionDelete.sourceDecisionId === null,
    "Principle sourceDecisionId should be set to null"
  );

  const [secondDecision] = await sql`
    INSERT INTO "Decision" ("userId", "title", "question")
    VALUES (${owner.id}, 'Cascade ownership', 'Does deleting the owner remove private domain data?')
    RETURNING "id"
  `;
  await sql`
    INSERT INTO "Judgment" ("decisionId", "userId", "summary")
    VALUES (${secondDecision.id}, ${owner.id}, 'Yes')
  `;
  await sql`
    INSERT INTO "DecisionOutcome" ("decisionId", "userId", "result")
    VALUES (${secondDecision.id}, ${owner.id}, 'Owner cascade verified')
  `;
  await sql`
    INSERT INTO "DecisionPrinciple" ("decisionId", "principleId", "userId", "relation")
    VALUES (${secondDecision.id}, ${principle.id}, ${owner.id}, 'applied')
  `;

  await sql`DELETE FROM "User" WHERE "id" = ${owner.id}`;
  cleanupUserId = null;
  assert(
    (await count("Decision", "userId", owner.id)) === 0,
    "Decision ownership cascade failed"
  );
  assert(
    (await count("Judgment", "userId", owner.id)) === 0,
    "Judgment ownership cascade failed"
  );
  assert(
    (await count("Principle", "userId", owner.id)) === 0,
    "Principle ownership cascade failed"
  );
  assert(
    (await count("DecisionPrinciple", "userId", owner.id)) === 0,
    "DecisionPrinciple ownership cascade failed"
  );
  assert(
    (await count("DecisionOutcome", "userId", owner.id)) === 0,
    "DecisionOutcome ownership cascade failed"
  );

  console.log("Foundation schema verification passed.");
} finally {
  if (cleanupUserId) {
    await sql`DELETE FROM "User" WHERE "id" = ${cleanupUserId}`.catch(
      () => undefined
    );
  }
  await sql.end({ timeout: 5 });
}
