import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { principle, user } from "@/lib/db/schema";

export const journalEntry = pgTable(
  "JournalEntry",
  {
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    occurredAt: timestamp("occurredAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userOccurredIdx: index("JournalEntry_user_occurred_idx").on(
      table.userId,
      table.occurredAt
    ),
  })
);

export type JournalEntry = typeof journalEntry.$inferSelect;

export const journalReflection = pgTable(
  "JournalReflection",
  {
    adoptedPrincipleId: uuid("adoptedPrincipleId").references(
      () => principle.id,
      { onDelete: "set null" }
    ),
    candidateId: uuid("candidateId"),
    candidateRationale: text("candidateRationale"),
    candidateStatement: text("candidateStatement"),
    candidateStatus: varchar("candidateStatus", {
      enum: ["pending", "adopted", "rejected"],
      length: 16,
    }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    entryId: uuid("entryId")
      .notNull()
      .references(() => journalEntry.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    observation: text("observation"),
    text: text("text").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    candidateStatusCheck: check(
      "JournalReflection_candidate_status_check",
      sql`${table.candidateStatus} IS NULL OR ${table.candidateStatus} IN ('pending', 'adopted', 'rejected')`
    ),
    entryUnique: uniqueIndex("JournalReflection_entry_unique").on(table.entryId),
    userIdx: index("JournalReflection_user_idx").on(table.userId),
  })
);

export type JournalReflection = typeof journalReflection.$inferSelect;

export const journalPrincipleLink = pgTable(
  "JournalPrincipleLink",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    entryId: uuid("entryId")
      .notNull()
      .references(() => journalEntry.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    principleId: uuid("principleId")
      .notNull()
      .references(() => principle.id, { onDelete: "cascade" }),
    reflectionId: uuid("reflectionId")
      .notNull()
      .references(() => journalReflection.id, { onDelete: "cascade" }),
    relation: varchar("relation", {
      enum: ["origin", "supports"],
      length: 16,
    })
      .notNull()
      .default("origin"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    principleIdx: index("JournalPrincipleLink_principle_idx").on(
      table.principleId
    ),
    reflectionPrincipleUnique: uniqueIndex(
      "JournalPrincipleLink_reflection_principle_unique"
    ).on(table.reflectionId, table.principleId),
    relationCheck: check(
      "JournalPrincipleLink_relation_check",
      sql`${table.relation} IN ('origin', 'supports')`
    ),
    userIdx: index("JournalPrincipleLink_user_idx").on(table.userId),
  })
);

export type JournalPrincipleLink = typeof journalPrincipleLink.$inferSelect;
