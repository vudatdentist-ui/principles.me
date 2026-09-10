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
          <p className={styles.eyebrow}>Organization</p>
          <h1 id="organization-title">Design the machine around reality.</h1>
        </div>
        <div className={styles.loop}>
          <span>Dream</span><b>→</b><span>Reality</span><b>→</b><span>Problem</span><b>→</b><span>Design</span>
        </div>
      </section>

      {active ? (
        <>
          <section className={styles.orientation} aria-label="Organization purpose and reality">
            <article className={styles.purpose}>
              <p className={styles.eyebrow}>Dream</p>
              <h2>{active.purpose || active.name}</h2>
              <span>{active.name}</span>
            </article>
            <article className={styles.reality}>
              <p className={styles.eyebrow}>Reality</p>
              {openIssues[0] ? (
                <>
                  <h2>{openIssues[0].observedReality}</h2>
                  <span>{openIssues.length} open issue{openIssues.length === 1 ? "" : "s"}</span>
                </>
              ) : (
                <h2>No open issues.</h2>
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
                      <span>{issue.createdByEmail}</span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3>{issue.title}</h3>
                    <p>{issue.tension}</p>
                    <details>
                      <summary>Reality and models</summary>
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
                <p className={styles.eyebrow}>Diagnosis</p>
                <h2 id="diagnosis-title">Competing models</h2>
              </div>
              <span>{unresolvedDisagreements.length} unresolved</span>
            </div>
            {unresolvedDisagreements.length > 0 ? (
              <div className={styles.disagreements}>
                {unresolvedDisagreements.slice(0, 4).map(({ disagreement, issue }) => (
                  <article key={disagreement.id}>
                    <span>{issue.title}</span>
                    <h3>{disagreement.statement}</h3>
                    {disagreement.reasoning ? <p>{disagreement.reasoning}</p> : null}
                    <small>{disagreement.raisedByEmail}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>No unresolved disagreements.</div>
            )}
          </section>

          <section className={styles.machineSection} aria-labelledby="machine-title">
            <div className={styles.sectionLead}>
              <div>
                <p className={styles.eyebrow}>Design</p>
                <h2 id="machine-title">Ownership and responsibility</h2>
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
                    <summary>Scope</summary>
                    <dl>
                      {role.decisionScope ? <div><dt>Decisions</dt><dd>{role.decisionScope}</dd></div> : null}
                      {role.responsibilities.map((responsibility) => (
                        <div key={responsibility.id}>
                          <dt>Owns</dt>
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
                  <p className={styles.eyebrow}>Evidence</p>
                  <h2 id="context-title">Contextual track record</h2>
                </div>
              </div>
              <div className={styles.evidenceGrid}>
                {active.contextEvidence.slice(0, 4).map((evidence) => (
                  <article key={evidence.id}>
                    <span>{evidence.context}</span>
                    <h3>{evidence.observation}</h3>
                    <details>
                      <summary>For / against</summary>
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
          <p className={styles.eyebrow}>Organization</p>
          <h2>Create your organization.</h2>
        </section>
      )}

      <details className={styles.operations} open={!active}>
        <summary>Operations</summary>
        <div className={styles.legacy}>
          <OrganizationWorkspace email={email} initialState={initialState} />
        </div>
      </details>
    </div>
  );
}
