import { index, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { principle, user } from "@/lib/db/schema";

export const goalStatus = pgEnum("goal_status", ["active", "completed", "archived"]);
export const problemStatus = pgEnum("problem_status", ["open", "resolved", "archived"]);
export const actionStatus = pgEnum("goal_action_status", ["todo", "doing", "done", "cancelled"]);
export const problemPrincipleRelation = pgEnum("problem_principle_relation", ["applied", "created"]);

export const goal = pgTable(
  "Goal",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    status: goalStatus("status").notNull().default("active"),
    title: text("title").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userStatusIdx: index("Goal_user_status_idx").on(table.userId, table.status),
  })
);

export const problem = pgTable(
  "Problem",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    goalId: uuid("goalId")
      .notNull()
      .references(() => goal.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    principleCandidate: text("principleCandidate"),
    status: problemStatus("status").notNull().default("open"),
    title: text("title").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    goalIdx: index("Problem_goal_idx").on(table.goalId),
    userGoalIdx: index("Problem_user_goal_idx").on(table.userId, table.goalId),
  })
);

export const diagnosis = pgTable(
  "Diagnosis",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    problemId: uuid("problemId")
      .notNull()
      .references(() => problem.id, { onDelete: "cascade" }),
    rootCause: text("rootCause").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    problemUnique: uniqueIndex("Diagnosis_problem_unique").on(table.problemId),
    userIdx: index("Diagnosis_user_idx").on(table.userId),
  })
);

export const goalAction = pgTable(
  "GoalAction",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    problemId: uuid("problemId")
      .notNull()
      .references(() => problem.id, { onDelete: "cascade" }),
    status: actionStatus("status").notNull().default("todo"),
    title: text("title").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    problemIdx: index("GoalAction_problem_idx").on(table.problemId),
    userProblemIdx: index("GoalAction_user_problem_idx").on(table.userId, table.problemId),
  })
);

export const problemPrinciple = pgTable(
  "ProblemPrinciple",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    principleId: uuid("principleId")
      .notNull()
      .references(() => principle.id, { onDelete: "cascade" }),
    problemId: uuid("problemId")
      .notNull()
      .references(() => problem.id, { onDelete: "cascade" }),
    relation: problemPrincipleRelation("relation").notNull().default("applied"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.problemId, table.principleId] }),
    principleIdx: index("ProblemPrinciple_principle_idx").on(table.principleId),
    userIdx: index("ProblemPrinciple_user_idx").on(table.userId),
  })
);

export type Goal = typeof goal.$inferSelect;
export type Problem = typeof problem.$inferSelect;
export type Diagnosis = typeof diagnosis.$inferSelect;
export type GoalAction = typeof goalAction.$inferSelect;
