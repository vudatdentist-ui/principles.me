import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createOrganizationEvolutionGoal,
  designOrganizationChange,
  diagnoseOrganizationProblem,
  recordOrganizationEvolutionIssue,
  recordOrganizationOutcome,
  reflectOnOrganizationOutcome,
  saveOrganizationPrinciple,
  updateOrganizationAction,
} from "../../features/organization/evolution-repository";
import { createOrganization } from "../../features/organization/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

test("organization Diagnosis and Principle retain kernel Evidence provenance", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("organization provenance password");
    const owner = await createAccount({ email: "provenance@org.test", passwordHash });
    const organization = await createOrganization({
      name: "Evidence Machine",
      userId: owner.userId,
    });
    const handle = organization.organizations[0]?.handle;
    assert.ok(handle);

    let state = await createOrganizationEvolutionGoal({
      desiredState: "Routine decisions happen at the accountable role.",
      handle,
      successConditions: "One routine decision completes without owner escalation.",
      userId: owner.userId,
      whyItMatters: "Decision quality must scale beyond the founder.",
    });
    const goal = state.goals[0];
    assert.ok(goal);

    state = await recordOrganizationEvolutionIssue({
      goalId: goal.id,
      handle,
      observedReality: "A routine decision waited for owner approval.",
      tension: "Observed behavior contradicts the chosen delegated machine.",
      title: "Routine decision escalated",
      userId: owner.userId,
    });
    const problem = state.goals[0]?.problems[0];
    assert.ok(problem);

    state = await diagnoseOrganizationProblem({
      contradictingEvidence: "One comparable decision was handled independently.",
      handle,
      problemId: problem.id,
      rootCauseHypothesis: "The decision boundary is not explicit in the operating machine.",
      supportingEvidence: "The recorded escalation occurred inside an intended delegated scope.",
      symptom: "Routine work waited for owner attention.",
      userId: owner.userId,
    });
    const diagnosis = state.goals[0]?.problems[0]?.diagnosis;
    assert.ok(diagnosis);

    const diagnosisProvenance = await db()`
      SELECT diagnosis_evidence.evidence_id, link.evidence_id AS issue_evidence_id
      FROM diagnosis_evidence
      JOIN organization_issue_kernel_links link
        ON link.workspace_id = diagnosis_evidence.workspace_id
        AND link.problem_id = ${problem.id}::uuid
      WHERE diagnosis_evidence.diagnosis_id = ${diagnosis.id}::uuid
    `;
    assert.equal(diagnosisProvenance.length, 1);
    assert.equal(
      String(diagnosisProvenance[0]?.evidence_id),
      String(diagnosisProvenance[0]?.issue_evidence_id)
    );

    state = await designOrganizationChange({
      actions: ["Document and exercise the delegated decision boundary."],
      assignedToEmail: "provenance@org.test",
      diagnosisId: diagnosis.id,
      expectedResult: "The next routine decision completes without owner escalation.",
      handle,
      machineChange: "Encode the delegated decision boundary in the operating process.",
      problemId: problem.id,
      rationale: "The machine lacks an executable boundary, not motivation.",
      successSignal: "The next routine decision completes independently.",
      userId: owner.userId,
    });
    const design = state.goals[0]?.problems[0]?.design;
    assert.ok(design);
    assert.ok(design.actions[0]);

    await updateOrganizationAction({
      actionId: design.actions[0].id,
      designId: design.id,
      handle,
      status: "completed",
      userId: owner.userId,
    });
    state = await recordOrganizationOutcome({
      actualResult: "The next routine decision completed without owner escalation.",
      comparison: "improved",
      designId: design.id,
      handle,
      userId: owner.userId,
    });
    assert.ok(state.goals[0]?.problems[0]?.design?.outcome);

    state = await reflectOnOrganizationOutcome({
      designId: design.id,
      happened: "The accountable role exercised the documented boundary.",
      handle,
      learning: "Decision rights compound only when they are explicit and exercised.",
      userId: owner.userId,
    });
    const reflection = state.goals[0]?.problems[0]?.design?.reflection;
    assert.ok(reflection);

    state = await saveOrganizationPrinciple({
      handle,
      rationale: "The observed outcome supports the rule in this decision context.",
      reflectionId: reflection.id,
      rule: "Put routine decisions with the accountable role and escalate named exceptions.",
      trigger: "When a recurring decision sits inside a documented role boundary",
      userId: owner.userId,
    });
    const principle = state.principles[0];
    assert.ok(principle);

    const principleProvenance = await db()`
      SELECT principle_evidence.evidence_id, outcomes.evidence_id AS outcome_evidence_id
      FROM principle_evidence
      JOIN principles
        ON principles.id = principle_evidence.principle_id
        AND principles.workspace_id = principle_evidence.workspace_id
      JOIN outcome_reflections
        ON outcome_reflections.reflection_id = principles.origin_reflection_id
        AND outcome_reflections.workspace_id = principles.workspace_id
      JOIN outcomes
        ON outcomes.id = outcome_reflections.outcome_id
        AND outcomes.workspace_id = outcome_reflections.workspace_id
      WHERE principle_evidence.principle_id = ${principle.id}::uuid
    `;
    assert.equal(principleProvenance.length, 1);
    assert.equal(
      String(principleProvenance[0]?.evidence_id),
      String(principleProvenance[0]?.outcome_evidence_id)
    );
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
