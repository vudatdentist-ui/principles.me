import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createOrganizationEvolutionGoal,
  designOrganizationChange,
  diagnoseOrganizationProblem,
  loadOrganizationEvolutionState,
  recordOrganizationEvolutionIssue,
  recordOrganizationOutcome,
  reflectOnOrganizationOutcome,
  saveOrganizationPrinciple,
  updateOrganizationAction,
} from "../../features/organization/evolution-repository";
import {
  addOrganizationMember,
  createOrganization,
  OrganizationConflictError,
  OrganizationForbiddenError,
  OrganizationMemberNotFoundError,
  raiseOrganizationDisagreement,
  recordOrganizationContextEvidence,
} from "../../features/organization/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

test("original Phase 5 plan completes the organization kernel loop end to end", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong organization loop password");
    const owner = await createAccount({ email: "owner@loop.test", passwordHash });
    const member = await createAccount({ email: "member@loop.test", passwordHash });
    const outsider = await createAccount({ email: "outsider@loop.test", passwordHash });

    let organizationState = await createOrganization({
      name: "Compounding Machine",
      purpose: "Run the same evolution loop as a team.",
      userId: owner.userId,
    });
    const handle = organizationState.organizations[0]?.handle;
    assert.ok(handle);
    organizationState = await addOrganizationMember({
      email: "member@loop.test",
      handle,
      userId: owner.userId,
    });
    assert.equal(organizationState.organizations[0]?.members.length, 2);

    let evolution = await createOrganizationEvolutionGoal({
      acceptedTradeoffs: "Spend one release slowing down to remove owner dependency.",
      desiredState: "Routine engineering releases operate without owner approval.",
      handle,
      nonNegotiables: "Do not weaken release quality.",
      successConditions: "Three consecutive routine releases ship without owner escalation.",
      userId: owner.userId,
      whyItMatters: "The organization cannot scale through one decision bottleneck.",
    });
    const goal = evolution.goals[0];
    assert.ok(goal);
    assert.equal(goal.status, "chosen");

    evolution = await recordOrganizationEvolutionIssue({
      goalId: goal.id,
      handle,
      observedReality: "Two routine releases still waited for owner sequencing approval.",
      tension: "Actual decision flow contradicts the chosen delegated operating model.",
      title: "Routine release sequencing still escalates",
      userId: member.userId,
    });
    const problem = evolution.goals[0]?.problems[0];
    assert.ok(problem);
    assert.equal(problem.createdByEmail, "member@loop.test");

    await raiseOrganizationDisagreement({
      handle,
      issueId: problem.issueId,
      reasoning: "One release also lacked explicit acceptance criteria.",
      statement: "Owner approval is not the only cause.",
      userId: member.userId,
    });
    await recordOrganizationContextEvidence({
      context: "routine release sequencing",
      email: "member@loop.test",
      evidenceAgainst: "One escalation still required owner intervention.",
      evidenceFor: "The member sequenced two comparable releases independently.",
      handle,
      observation: "The member has relevant recent experience in this decision context.",
      userId: owner.userId,
    });

    await assert.rejects(
      diagnoseOrganizationProblem({
        handle,
        problemId: problem.id,
        rootCauseHypothesis: "Member should not be able to accept the durable diagnosis.",
        symptom: "Escalation",
        userId: member.userId,
      }),
      (error: unknown) => error instanceof OrganizationForbiddenError
    );

    evolution = await diagnoseOrganizationProblem({
      alternativeHypotheses: "Acceptance criteria may explain part of the delay.",
      contradictingEvidence: "One delayed release had no explicit owner approval request.",
      handle,
      problemId: problem.id,
      proximateCause: "Routine sequencing choices are still escalated upward.",
      rootCauseHypothesis: "Decision rights exist in language but are not encoded in the release machine.",
      supportingEvidence: "Repeated escalations occur despite the stated delegation intent.",
      symptom: "Routine releases wait for owner attention.",
      uncertainty: "Need to separate unclear acceptance criteria from true approval waits.",
      userId: owner.userId,
    });
    const diagnosis = evolution.goals[0]?.problems[0]?.diagnosis;
    assert.ok(diagnosis);

    await assert.rejects(
      designOrganizationChange({
        actions: ["Document the release decision boundary."],
        assignedToEmail: "outsider@loop.test",
        diagnosisId: diagnosis.id,
        expectedResult: "Routine releases stop escalating.",
        handle,
        machineChange: "Delegate routine sequencing.",
        problemId: problem.id,
        rationale: "Test membership enforcement.",
        successSignal: "No escalation.",
        userId: owner.userId,
      }),
      (error: unknown) => error instanceof OrganizationMemberNotFoundError
    );

    evolution = await designOrganizationChange({
      actions: [
        "Write the routine sequencing decision boundary.",
        "Run the next release using the delegated boundary.",
      ],
      assignedToEmail: "member@loop.test",
      diagnosisId: diagnosis.id,
      expectedResult: "Routine releases proceed without owner approval while quality holds.",
      handle,
      machineChange: "Move routine release sequencing authority to the Engineering Lead boundary.",
      problemId: problem.id,
      rationale: "The root cause is ambiguous decision rights in the machine, not lack of effort.",
      successSignal: "A routine release ships without owner escalation and passes existing quality checks.",
      userId: owner.userId,
    });
    const design = evolution.goals[0]?.problems[0]?.design;
    assert.ok(design);
    assert.equal(design.ownerEmail, "member@loop.test");
    assert.equal(design.actions.length, 2);

    await assert.rejects(
      updateOrganizationAction({
        actionId: design.actions[0]?.id ?? "",
        designId: design.id,
        handle,
        status: "completed",
        userId: outsider.userId,
      })
    );

    evolution = await updateOrganizationAction({
      actionId: design.actions[0]?.id ?? "",
      designId: design.id,
      handle,
      status: "completed",
      userId: member.userId,
    });
    await assert.rejects(
      recordOrganizationOutcome({
        actualResult: "One action is still pending.",
        comparison: "unclear",
        designId: design.id,
        handle,
        userId: member.userId,
      }),
      (error: unknown) => error instanceof OrganizationConflictError
    );
    evolution = await updateOrganizationAction({
      actionId: design.actions[1]?.id ?? "",
      designId: design.id,
      handle,
      status: "completed",
      userId: member.userId,
    });
    assert.equal(
      evolution.goals[0]?.problems[0]?.design?.actions.every((action) => action.status === "completed"),
      true
    );

    evolution = await recordOrganizationOutcome({
      actualResult: "The next routine release shipped without owner escalation and passed quality checks.",
      comparison: "improved",
      designId: design.id,
      handle,
      userId: member.userId,
    });
    assert.equal(evolution.goals[0]?.problems[0]?.design?.outcome?.comparison, "improved");

    evolution = await reflectOnOrganizationOutcome({
      designId: design.id,
      expected: "Delegated sequencing would preserve quality and remove the wait.",
      happened: "The release shipped independently with the existing quality bar intact.",
      handle,
      learning: "Decision rights become real only when the machine states the boundary and a named owner exercises it.",
      recurring: true,
      surprise: "No compensating quality failure appeared.",
      userId: member.userId,
    });
    const reflection = evolution.goals[0]?.problems[0]?.design?.reflection;
    assert.ok(reflection);

    evolution = await saveOrganizationPrinciple({
      handle,
      rationale: "This release converted an abstract delegation intent into observed evidence.",
      reflectionId: reflection.id,
      rule: "Put routine decisions with the role closest to the work and escalate only explicit exceptions.",
      trigger: "When a recurring decision is within a role's defined boundary",
      userId: owner.userId,
    });
    assert.equal(evolution.principles.length, 1);
    assert.equal(evolution.principles[0]?.lifecycleState, "testing");
    assert.equal(evolution.goals[0]?.problems[0]?.status, "resolved");

    const revised = await saveOrganizationPrinciple({
      handle,
      principleId: evolution.principles[0]?.id,
      rationale: "Clarify the exception boundary after team reflection.",
      reflectionId: reflection.id,
      rule: "Delegate routine decisions to the accountable role; escalate only named exception classes.",
      trigger: "When a recurring decision falls inside a documented role boundary",
      userId: owner.userId,
    });
    assert.equal(revised.principles[0]?.acceptanceState, "revised");
    assert.equal(revised.principles[0]?.lifecycleState, "revised");

    const reloaded = await loadOrganizationEvolutionState(member.userId, handle);
    assert.equal(reloaded.goals[0]?.problems[0]?.design?.outcome?.actualResult.includes("without owner escalation"), true);
    assert.equal(reloaded.contextEvidence[0]?.subjectEmail, "member@loop.test");
    assert.equal(reloaded.principles[0]?.rule.includes("named exception classes"), true);

    const profileRows = await db()`
      SELECT workspace_id
      FROM organization_profiles
      WHERE handle = ${handle}
    `;
    const workspaceId = String(profileRows[0]?.workspace_id);
    const serialized = JSON.stringify(reloaded);
    assert.equal(serialized.includes(workspaceId), false);
    assert.equal(serialized.includes(owner.userId), false);
    assert.equal(serialized.includes(member.userId), false);
    assert.equal(serialized.includes("workspaceId"), false);
    assert.equal(serialized.includes("userId"), false);
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
