export type OrganizationMembershipRole = "member" | "owner";
export type OrganizationIssueStatus = "open" | "resolved";

export interface ClientOrganizationResponsibility {
  readonly expectedOutcome: string | null;
  readonly id: string;
  readonly statement: string;
}

export interface ClientOrganizationRole {
  readonly decisionScope: string | null;
  readonly id: string;
  readonly memberEmails: string[];
  readonly name: string;
  readonly purpose: string | null;
  readonly responsibilities: ClientOrganizationResponsibility[];
}

export interface ClientOrganizationTeam {
  readonly id: string;
  readonly memberEmails: string[];
  readonly name: string;
  readonly purpose: string | null;
}

export interface ClientOrganizationMember {
  readonly email: string;
  readonly membershipRole: OrganizationMembershipRole;
}

export interface ClientOrganizationDisagreement {
  readonly createdAt: string;
  readonly id: string;
  readonly raisedByEmail: string;
  readonly reasoning: string | null;
  readonly resolution: string | null;
  readonly resolvedByEmail: string | null;
  readonly statement: string;
  readonly status: OrganizationIssueStatus;
}

export interface ClientOrganizationIssue {
  readonly createdAt: string;
  readonly createdByEmail: string;
  readonly disagreements: ClientOrganizationDisagreement[];
  readonly id: string;
  readonly observedReality: string;
  readonly resolution: string | null;
  readonly resolvedByEmail: string | null;
  readonly status: OrganizationIssueStatus;
  readonly tension: string;
  readonly title: string;
}

export interface ClientOrganizationContextEvidence {
  readonly context: string;
  readonly createdAt: string;
  readonly createdByEmail: string;
  readonly evidenceAgainst: string | null;
  readonly evidenceFor: string | null;
  readonly id: string;
  readonly observation: string;
  readonly subjectEmail: string;
}

export interface ClientOrganization {
  readonly contextEvidence: ClientOrganizationContextEvidence[];
  readonly handle: string;
  readonly issues: ClientOrganizationIssue[];
  readonly members: ClientOrganizationMember[];
  readonly membershipRole: OrganizationMembershipRole;
  readonly name: string;
  readonly purpose: string | null;
  readonly roles: ClientOrganizationRole[];
  readonly teams: ClientOrganizationTeam[];
}

export interface ClientOrganizationState {
  readonly organizations: ClientOrganization[];
}
