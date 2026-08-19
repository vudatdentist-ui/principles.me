DO $$ BEGIN
 CREATE TYPE "goal_status" AS ENUM('active', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "problem_status" AS ENUM('open', 'resolved', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "goal_action_status" AS ENUM('todo', 'doing', 'done', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "problem_principle_relation" AS ENUM('applied', 'created');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Goal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "title" text NOT NULL,
  "status" "goal_status" DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Problem" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goalId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "title" text NOT NULL,
  "status" "problem_status" DEFAULT 'open' NOT NULL,
  "principleCandidate" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Diagnosis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "problemId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "rootCause" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GoalAction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "problemId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "title" text NOT NULL,
  "status" "goal_action_status" DEFAULT 'todo' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProblemPrinciple" (
  "problemId" uuid NOT NULL,
  "principleId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "relation" "problem_principle_relation" DEFAULT 'applied' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ProblemPrinciple_problemId_principleId_pk" PRIMARY KEY("problemId","principleId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Problem" ADD CONSTRAINT "Problem_goalId_Goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."Goal"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Problem" ADD CONSTRAINT "Problem_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_problemId_Problem_id_fk" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GoalAction" ADD CONSTRAINT "GoalAction_problemId_Problem_id_fk" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GoalAction" ADD CONSTRAINT "GoalAction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProblemPrinciple" ADD CONSTRAINT "ProblemPrinciple_problemId_Problem_id_fk" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProblemPrinciple" ADD CONSTRAINT "ProblemPrinciple_principleId_Principle_id_fk" FOREIGN KEY ("principleId") REFERENCES "public"."Principle"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProblemPrinciple" ADD CONSTRAINT "ProblemPrinciple_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Goal_user_status_idx" ON "Goal" USING btree ("userId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Problem_goal_idx" ON "Problem" USING btree ("goalId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Problem_user_goal_idx" ON "Problem" USING btree ("userId","goalId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Diagnosis_problem_unique" ON "Diagnosis" USING btree ("problemId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Diagnosis_user_idx" ON "Diagnosis" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "GoalAction_problem_idx" ON "GoalAction" USING btree ("problemId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "GoalAction_user_problem_idx" ON "GoalAction" USING btree ("userId","problemId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ProblemPrinciple_principle_idx" ON "ProblemPrinciple" USING btree ("principleId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ProblemPrinciple_user_idx" ON "ProblemPrinciple" USING btree ("userId");
