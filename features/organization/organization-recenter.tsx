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
  const currentIssue = openIssues[0] ?? null;

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="organization-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Organization · living machine</p>
          <h1 id="organization-title">Design the machine around reality.</h1>
          <p className={styles.heroDeck}>
            Hold purpose, observed reality, ownership, and the next organizational tension in the same frame. Structure only matters when it helps the organization respond to what is true.
          </p>
          <div className={styles.loop} aria-label="Organization narrative arc">
            <span>Dream / Intent</span><b>→</b><span>Reality</span><b>→</b><span>Tension</span><b>→</b><span>Responsibility</span><b>→</b><span>Decision / Design</span>
          </div>
        </div>

        <aside className={styles.currentScene} aria-label="Current organization narrative">
          <span>01 / 06 · Current tension</span>
          <strong>{currentIssue?.title || "No open issue."}</strong>
          <p>{currentIssue?.tension || "The machine has no recorded tension that currently needs a decision."}</p>
          <dl>
            <div>
              <dt>Intent</dt>
              <dd>{active?.purpose || active?.name || "Create an organization to name its purpose."}</dd>
            </div>
            <div>
              <dt>Reality</dt>
              <dd>{currentIssue?.observedReality || "No open issue is defining current reality."}</dd>
            </div>
            <div>
              <dt>Ownership</dt>
              <dd>{active ? `${active.roles.length} roles · ${responsibilityCount} responsibilities` : "Not designed yet"}</dd>
            </div>
          </dl>
          <a href="#organization-operations">Work on the machine →</a>
        </aside>
      </section>

      {active ? (
        <>
          <section className={styles.orientation} aria-label="Organization purpose and reality">
            <article className={styles.purpose}>
              <p className={styles.eyebrow}>Intent</p>
              <h2>{active.purpose || active.name}</h2>
              <span>{active.name}</span>
            </article>
            <article className={styles.reality}>
              <p className={styles.eyebrow}>Reality</p>
              {currentIssue ? (
                <>
                  <h2>{currentIssue.observedReality}</h2>
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
                  <p className={styles.eyebrow}>Tension</p>
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
                <p className={styles.eyebrow}>Models</p>
                <h2 aria-label="Competing models" id="diagnosis-title">What are we seeing differently?</h2>
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
                <p className={styles.eyebrow}>Responsibility</p>
                <h2 id="machine-title">Who owns what must change?</h2>
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
                  <p className={styles.eyebrow}>Consequence</p>
                  <h2 id="context-title">What does the track record say?</h2>
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
          <p>Name the purpose, observe reality, then assign responsibility around the tensions that matter.</p>
        </section>
      )}

      <details className={styles.operations} id="organization-operations" open={!active}>
        <summary>Operations</summary>
        <div className={styles.legacy}>
          <OrganizationWorkspace email={email} initialState={initialState} />
        </div>
      </details>
    </div>
  );
}
