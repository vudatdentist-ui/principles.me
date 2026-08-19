import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export const decision = pgTable("Decision", {
  context: text("context"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  objective: text("objective"),
  question: text("question").notNull(),
  status: varchar("status", {
    enum: ["open", "decided", "review_due", "reviewed", "archived"],
  })
    .notNull()
    .default("open"),
  title: text("title").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Decision = InferSelectModel<typeof decision>;

export const judgment = pgTable("Judgment", {
  confidence: varchar("confidence", {
    enum: ["low", "medium", "high"],
  }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  decisionId: uuid("decisionId")
    .notNull()
    .references(() => decision.id),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  rationale: text("rationale"),
  selectedOption: text("selectedOption"),
  summary: text("summary").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Judgment = InferSelectModel<typeof judgment>;

export const principle = pgTable("Principle", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sourceDecisionId: uuid("sourceDecisionId").references(() => decision.id),
  statement: text("statement").notNull(),
  status: varchar("status", { enum: ["active", "retired"] })
    .notNull()
    .default("active"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Principle = InferSelectModel<typeof principle>;

export const decisionPrinciple = pgTable(
  "DecisionPrinciple",
  {
    decisionId: uuid("decisionId")
      .notNull()
      .references(() => decision.id),
    principleId: uuid("principleId")
      .notNull()
      .references(() => principle.id),
    relation: varchar("relation", {
      enum: ["applied", "challenged", "created"],
    })
      .notNull()
      .default("applied"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.decisionId, table.principleId] }),
  })
);

export type DecisionPrinciple = InferSelectModel<typeof decisionPrinciple>;

export const decisionOutcome = pgTable("DecisionOutcome", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  decisionId: uuid("decisionId")
    .notNull()
    .references(() => decision.id),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  lessons: text("lessons"),
  result: text("result").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  verdict: varchar("verdict", {
    enum: ["good_decision", "bad_decision", "mixed", "too_early"],
  })
    .notNull()
    .default("too_early"),
});

export type DecisionOutcome = InferSelectModel<typeof decisionOutcome>;
