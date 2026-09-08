import type { OrganizationMembershipRole } from "./contracts";

export type OrganizationOutcomeComparison = "improved" | "mixed" | "worse" | "unclear";
export type OrganizationActionStatus = "pending" | "completed" | "cancelled";

export interface ClientOrganizationEvolutionMember {
  readonly email: string;
  readonly membershipRole: OrganizationMembershipRole;
}

export interface ClientOrganizationEvolutionContextEvidence {
  readonly context: string;
  readonly createdByEmail: string;
  readonly evidenceAgainst: string | null;
  readonly evidenceFor: string | null;
  readonly observation: string;
  readonly subjectEmail: string;
}

export interface ClientOrganizationEvolutionAction {
  readonly commitment: string;
  readonly id: string;
  readonly position: number;
  readonly status: OrganizationActionStatus;
}

export interface ClientOrganizationEvolutionOutcome {
  readonly actualResult: string;
  readonly comparison: OrganizationOutcomeComparison;
  readonly expectedResult: string;
  readonly id: string;
  readonly observedAt: string;
}

export interface ClientOrganizationEvolutionReflection {
  readonly expected: string | null;
  readonly happened: string;
  readonly id: string;
  readonly learning: string | null;
  readonly recurring: boolean | null;
  readonly surprise: string | null;
}

export interface ClientOrganizationEvolutionDesign {
  readonly acceptanceState: "accepted" | "revised";
  readonly actions: ClientOrganizationEvolutionAction[];
  readonly expectedResult: string;
  readonly id: string;
  readonly machineChange: string;
  readonly outcome: ClientOrganizationEvolutionOutcome | null;
  readonly ownerEmail: string;
  readonly rationale: string;
  readonly reflection: ClientOrganizationEvolutionReflection | null;
  readonly successSignal: string;
}

export interface ClientOrganizationEvolutionDiagnosis {
  readonly alternativeHypotheses: string | null;
  readonly contradictingEvidence: string | null;
  readonly id: string;
  readonly proximateCause: string | null;
  readonly rootCauseHypothesis: string;
  readonly supportingEvidence: string | null;
  readonly symptom: string;
  readonly uncertainty: string | null;
}

export interface ClientOrganizationEvolutionDisagreement {
  readonly raisedByEmail: string;
  readonly reasoning: string | null;
  readonly statement: string;
  readonly status: "open" | "resolved";
}

export interface ClientOrganizationEvolutionProblem {
  readonly createdByEmail: string;
  readonly diagnosis: ClientOrganizationEvolutionDiagnosis | null;
  readonly disagreements: ClientOrganizationEvolutionDisagreement[];
  readonly gap: string | null;
  readonly id: string;
  readonly issueId: string;
  readonly observedReality: string;
  readonly status: "recognized" | "resolved" | "retired";
  readonly statement: string;
  readonly design: ClientOrganizationEvolutionDesign | null;
}

export interface ClientOrganizationEvolutionGoal {
  readonly acceptedTradeoffs: string | null;
  readonly desiredState: string;
  readonly id: string;
  readonly measures: string | null;
  readonly nonNegotiables: string | null;
  readonly problems: ClientOrganizationEvolutionProblem[];
  readonly status: "discovering" | "chosen" | "paused" | "completed" | "retired";
  readonly successConditions: string | null;
  readonly whyItMatters: string | null;
}

export interface ClientOrganizationEvolutionPrinciple {
  readonly acceptanceState: "accepted" | "revised";
  readonly id: string;
  readonly lifecycleState: "testing" | "revised" | "challenged" | "trusted" | "retired" | "candidate";
  readonly rationale: string | null;
  readonly rule: string;
  readonly trigger: string;
}

export interface ClientOrganizationEvolutionState {
  readonly contextEvidence: ClientOrganizationEvolutionContextEvidence[];
  readonly handle: string;
  readonly members: ClientOrganizationEvolutionMember[];
  readonly membershipRole: OrganizationMembershipRole;
  readonly name: string;
  readonly goals: ClientOrganizationEvolutionGoal[];
  readonly principles: ClientOrganizationEvolutionPrinciple[];
}
