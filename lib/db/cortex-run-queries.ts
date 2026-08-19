import "server-only";

import postgres from "postgres";
import type {
  CortexAnswers,
  CortexClarification,
  CortexResult,
  CortexRunInput,
  CortexRunRecord,
  CortexRunStore,
} from "@/lib/cortex/types";

const sql = postgres(process.env.POSTGRES_URL ?? "");

type CortexRunRow = {
  id: string;
  userId: string;
  input: CortexRunInput;
  answers: CortexAnswers;
  status: "clarify" | "complete";
  clarification: CortexClarification | null;
  result: CortexResult | null;
};

function asRecord(row: CortexRunRow): CortexRunRecord {
  return {
    answers: row.answers ?? {},
    clarification: row.clarification ?? null,
    id: row.id,
    input: row.input,
    result: row.result ?? null,
    status: row.status,
    userId: row.userId,
  };
}

export const cortexRunStore: CortexRunStore = {
  async create(record) {
    await sql`
      INSERT INTO "CortexRun" (
        "id", "userId", "decisionId", "input", "answers", "status",
        "clarification", "result", "evidence", "createdAt", "updatedAt"
      ) VALUES (
        ${record.id}::uuid,
        ${record.userId}::uuid,
        ${record.input.decisionId ?? null}::uuid,
        ${JSON.stringify(record.input)}::jsonb,
        ${JSON.stringify(record.answers)}::jsonb,
        ${record.status},
        ${record.clarification ? JSON.stringify(record.clarification) : null}::jsonb,
        ${record.result ? JSON.stringify(record.result) : null}::jsonb,
        ${JSON.stringify(record.result?.evidence ?? [])}::jsonb,
        now(),
        now()
      )
    `;
  },

  async get({ runId, userId }) {
    const rows = await sql<CortexRunRow[]>`
      SELECT
        "id",
        "userId",
        "input",
        "answers",
        "status",
        "clarification",
        "result"
      FROM "CortexRun"
      WHERE "id" = ${runId}::uuid AND "userId" = ${userId}::uuid
      LIMIT 1
    `;
    const [row] = rows;
    return row ? asRecord(row) : null;
  },

  async update(record) {
    const rows = await sql<{ id: string }[]>`
      UPDATE "CortexRun"
      SET
        "answers" = ${JSON.stringify(record.answers)}::jsonb,
        "status" = ${record.status},
        "clarification" = ${record.clarification ? JSON.stringify(record.clarification) : null}::jsonb,
        "result" = ${record.result ? JSON.stringify(record.result) : null}::jsonb,
        "evidence" = ${JSON.stringify(record.result?.evidence ?? [])}::jsonb,
        "updatedAt" = now()
      WHERE "id" = ${record.id}::uuid AND "userId" = ${record.userId}::uuid
      RETURNING "id"
    `;
    const [updated] = rows;
    if (!updated) {
      throw new Error("Cortex run update failed owner check.");
    }
  },
};
