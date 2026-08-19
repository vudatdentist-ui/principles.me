import { type InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  email: varchar("email", { length: 64 }).notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  name: text("name"),
  password: varchar("password", { length: 64 }),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  attachments: json("attachments").notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    isUpvoted: boolean("isUpvoted").notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    content: text("content"),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    createdAt: timestamp("createdAt").notNull(),
    description: text("description"),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    documentId: uuid("documentId").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    isResolved: boolean("isResolved").notNull().default(false),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const decisionStatus = pgEnum("decision_status", [
  "draft",
  "exploring",
  "decided",
  "review_due",
  "reviewed",
  "archived",
]);

export const judgmentConfidence = pgEnum("judgment_confidence", [
  "low",
  "medium",
  "high",
]);

export const principleStatus = pgEnum("principle_status", [
  "active",
  "revised",
  "retired",
]);

export const decisionPrincipleRelation = pgEnum("decision_principle_relation", [
  "suggested",
  "applied",
  "challenged",
  "created",
  "adopted",
]);

export const decisionOutcomeVerdict = pgEnum("decision_outcome_verdict", [
  "positive",
  "mixed",
  "negative",
  "too_early",
]);

export const decision = pgTable(
  "Decision",
  {
    context: text("context"),
    councilAnalysis: text("councilAnalysis"),
    councilBrief: json("councilBrief"),
    councilPlan: json("councilPlan"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    decidedAt: timestamp("decidedAt"),
    evidence: json("evidence"),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    objective: text("objective"),
    principleCandidate: json("principleCandidate"),
    question: text("question").notNull(),
    reviewAt: timestamp("reviewAt"),
    reviewedAt: timestamp("reviewedAt"),
    status: decisionStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdx: index("Decision_user_idx").on(table.userId),
    userStatusIdx: index("Decision_user_status_idx").on(
      table.userId,
      table.status
    ),
  })
);

export type Decision = InferSelectModel<typeof decision>;

export const judgment = pgTable(
  "Judgment",
  {
    confidence: judgmentConfidence("confidence"),
    confidencePercent: integer("confidencePercent"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    decisionId: uuid("decisionId")
      .notNull()
      .references(() => decision.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    rationale: text("rationale"),
    selectedOption: text("selectedOption"),
    summary: text("summary").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    confidencePercentCheck: check(
      "Judgment_confidence_percent_check",
      sql`${table.confidencePercent} IS NULL OR (${table.confidencePercent} >= 0 AND ${table.confidencePercent} <= 100)`
    ),
    decisionIdx: index("Judgment_decision_idx").on(table.decisionId),
    userIdx: index("Judgment_user_idx").on(table.userId),
  })
);

export type Judgment = InferSelectModel<typeof judgment>;

export const principle = pgTable(
  "Principle",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    description: text("description"),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    revision: integer("revision").notNull().default(1),
    sourceDecisionId: uuid("sourceDecisionId").references(() => decision.id, {
      onDelete: "set null",
    }),
    statement: text("statement").notNull(),
    status: principleStatus("status").notNull().default("active"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    sourceDecisionIdx: index("Principle_source_decision_idx").on(
      table.sourceDecisionId
    ),
    userStatusIdx: index("Principle_user_status_idx").on(
      table.userId,
      table.status
    ),
  })
);

export type Principle = InferSelectModel<typeof principle>;

export const principleRevision = pgTable(
  "PrincipleRevision",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    description: text("description"),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    principleId: uuid("principleId")
      .notNull()
      .references(() => principle.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    statement: text("statement").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    principleIdx: index("PrincipleRevision_principle_idx").on(
      table.principleId
    ),
    principleRevisionUnique: uniqueIndex(
      "PrincipleRevision_principle_revision_unique"
    ).on(table.principleId, table.revision),
    userIdx: index("PrincipleRevision_user_idx").on(table.userId),
  })
);

export type PrincipleRevision = InferSelectModel<typeof principleRevision>;

export const decisionPrinciple = pgTable(
  "DecisionPrinciple",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    decisionId: uuid("decisionId")
      .notNull()
      .references(() => decision.id, { onDelete: "cascade" }),
    principleId: uuid("principleId")
      .notNull()
      .references(() => principle.id, { onDelete: "cascade" }),
    relation: decisionPrincipleRelation("relation")
      .notNull()
      .default("applied"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.decisionId, table.principleId] }),
    principleIdx: index("DecisionPrinciple_principle_idx").on(
      table.principleId
    ),
    userIdx: index("DecisionPrinciple_user_idx").on(table.userId),
  })
);

export type DecisionPrinciple = InferSelectModel<typeof decisionPrinciple>;

export const decisionOutcome = pgTable(
  "DecisionOutcome",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    decisionId: uuid("decisionId")
      .notNull()
      .references(() => decision.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    lessons: text("lessons"),
    result: text("result").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verdict: decisionOutcomeVerdict("verdict").notNull().default("too_early"),
  },
  (table) => ({
    decisionIdx: index("DecisionOutcome_decision_idx").on(table.decisionId),
    userIdx: index("DecisionOutcome_user_idx").on(table.userId),
  })
);

export type DecisionOutcome = InferSelectModel<typeof decisionOutcome>;
