"use client";

import { useMemo } from "react";
import type { ClientOrganizationState } from "./contracts";
import { OrganizationWorkspace } from "./organization-workspace";
import styles from "./organization-recenter.module.css";

export function OrganizationRecenter({
  email,
  initialState,
}: {
  email: string;
  initialState: ClientOrganizationState;
}) {
  const active = initialState.organizations[0] ?? null;
  const openIssues = useMemo(
    () => active?.issues.filter((issue) => issue.status === "open") ?? [],
    [active]
  );
  const unresolvedDisagreements = useMemo(
    () =>
      openIssues.flatMap((issue) =>
        issue.disagreements
          .filter((disagreement) => disagreement.status === "open")
          .map((disagreement) => ({ disagreement, issue }))
      ),
    [openIssues]
  );
  const responsibilityCount =
    active?.roles.reduce((total, role) => total + role.responsibilities.length, 0) ?? 0;

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="organization-title">
        <div>
          <p className={styles.eyebrow}>Principles for Organizations</p>
          <h1 id="organization-title">Design the machine around reality.</h1>
          <p>
            A healthy organization makes its purpose, observed problems, conflicting models,
            responsibilities, and machine changes explicit. Disagreement is evidence to inspect,
            not a people score.
          </p>
        </div>
        <div className={styles.loop} aria-label="Organization evolution loop">
          <span>Shared Dream</span><b>→</b><span>Reality</span><b>→</b><span>Problem</span><b>→</b><span>Machine Design</span>
        </div>
      </section>

      {active ? (
        <>
          <section className={styles.orientation} aria-label="Organization purpose and reality">
            <article className={styles.purpose}>
              <p className={styles.eyebrow}>Shared Dream</p>
              <h2>{active.purpose || active.name}</h2>
              <span>{active.name}</span>
            </article>
            <article className={styles.reality}>
              <p className={styles.eyebrow}>Current Reality</p>
              {openIssues[0] ? (
                <>
                  <h2>{openIssues[0].observedReality}</h2>
                  <span>{openIssues.length} open issue{openIssues.length === 1 ? "" : "s"} need attention</span>
                </>
              ) : (
                <>
                  <h2>No unresolved issue is currently recorded.</h2>
                  <span>Keep observing the machine instead of assuming it works.</span>
                </>
              )}
            </article>
          </section>

          {openIssues.length > 0 ? (
            <section className={styles.issueSection} aria-labelledby="issues-title">
              <div className={styles.sectionLead}>
                <div>
                  <p className={styles.eyebrow}>Problems</p>
                  <h2 id="issues-title">Where is the machine failing?</h2>
                </div>
                <span>{openIssues.length} open</span>
              </div>
              <div className={styles.issues}>
                {openIssues.slice(0, 4).map((issue) => (
                  <article key={issue.id}>
                    <div className={styles.issueMeta}>
                      <span>Observed by {issue.createdByEmail}</span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3>{issue.title}</h3>
                    <p>{issue.tension}</p>
                    <details>
                      <summary>Observed reality and competing models</summary>
                      <dl>
                        <div><dt>Reality</dt><dd>{issue.observedReality}</dd></div>
                        {issue.disagreements.map((disagreement) => (
                          <div key={disagreement.id}>
                            <dt>{disagreement.raisedByEmail}</dt>
                            <dd>{disagreement.statement}{disagreement.reasoning ? ` — ${disagreement.reasoning}` : ""}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.diagnosisSection} aria-labelledby="diagnosis-title">
            <div className={styles.sectionLead}>
              <div>
                <p className={styles.eyebrow}>Diagnosis evidence</p>
                <h2 id="diagnosis-title">Different models of reality should become inspectable.</h2>
              </div>
              <span>{unresolvedDisagreements.length} unresolved disagreement{unresolvedDisagreements.length === 1 ? "" : "s"}</span>
            </div>
            {unresolvedDisagreements.length > 0 ? (
              <div className={styles.disagreements}>
                {unresolvedDisagreements.slice(0, 4).map(({ disagreement, issue }) => (
                  <article key={disagreement.id}>
                    <span>{issue.title}</span>
                    <h3>{disagreement.statement}</h3>
                    {disagreement.reasoning ? <p>{disagreement.reasoning}</p> : null}
                    <small>Raised by {disagreement.raisedByEmail}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>No unresolved disagreement is currently challenging the shared model.</div>
            )}
          </section>

          <section className={styles.machineSection} aria-labelledby="machine-title">
            <div className={styles.sectionLead}>
              <div>
                <p className={styles.eyebrow}>Machine Design</p>
                <h2 id="machine-title">Make who owns what explicit.</h2>
              </div>
              <span>{active.roles.length} roles · {responsibilityCount} responsibilities · {active.teams.length} teams</span>
            </div>
            <div className={styles.machineGrid}>
              {active.roles.slice(0, 4).map((role) => (
                <article key={role.id}>
                  <span>Role</span>
                  <h3>{role.name}</h3>
                  {role.purpose ? <p>{role.purpose}</p> : null}
                  <details>
                    <summary>Responsibility and decision scope</summary>
                    <dl>
                      {role.decisionScope ? <div><dt>Decision scope</dt><dd>{role.decisionScope}</dd></div> : null}
                      {role.responsibilities.map((responsibility) => (
                        <div key={responsibility.id}>
                          <dt>Responsibility</dt>
                          <dd>{responsibility.statement}{responsibility.expectedOutcome ? ` → ${responsibility.expectedOutcome}` : ""}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </article>
              ))}
            </div>
          </section>

          {active.contextEvidence.length > 0 ? (
            <section className={styles.evidenceSection} aria-labelledby="context-title">
              <div className={styles.sectionLead}>
                <div>
                  <p className={styles.eyebrow}>Contextual track record</p>
                  <h2 id="context-title">Evidence belongs to a context, not a permanent score.</h2>
                </div>
              </div>
              <div className={styles.evidenceGrid}>
                {active.contextEvidence.slice(0, 4).map((evidence) => (
                  <article key={evidence.id}>
                    <span>{evidence.context}</span>
                    <h3>{evidence.observation}</h3>
                    <details>
                      <summary>Evidence for / against</summary>
                      <p><strong>For:</strong> {evidence.evidenceFor || "Not recorded"}</p>
                      <p><strong>Against:</strong> {evidence.evidenceAgainst || "Not recorded"}</p>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className={styles.emptyState}>
          <p className={styles.eyebrow}>Start with purpose</p>
          <h2>Create the machine you want to improve.</h2>
          <p>An organization needs an explicit purpose before Issues, disagreements, roles, and evidence have context.</p>
        </section>
      )}

      <details className={styles.operations} open={!active}>
        <summary>
          <span>Operate the machine</span>
          <strong>Create organizations, record issues, govern roles, resolve disagreements, and add evidence</strong>
        </summary>
        <div className={styles.legacy}>
          <OrganizationWorkspace email={email} initialState={initialState} />
        </div>
      </details>
    </div>
  );
}
