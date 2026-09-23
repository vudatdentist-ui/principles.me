"use client";

import { T, useI18n } from "@/features/i18n/locale";
import { ChapterNav } from "@/features/ui/chapter-nav";
import { useMemo, useRef, useState } from "react";
import type { ClientOrganizationState } from "./contracts";
import { OrganizationWorkspace } from "./organization-workspace";
import styles from "./organization-recenter.module.css";

export function OrganizationRecenter({
  initialState,
}: {
  initialState: ClientOrganizationState;
}) {
  const { locale, t } = useI18n();
  const [state, setState] = useState(initialState);
  const operationsRef = useRef<HTMLDetailsElement>(null);
  const [activeHandle, setActiveHandle] = useState(
    initialState.organizations[0]?.handle ?? "",
  );
  const active = useMemo(
    () =>
      state.organizations.find(
        (organization) => organization.handle === activeHandle,
      ) ??
      state.organizations[0] ??
      null,
    [activeHandle, state.organizations],
  );
  const openIssues = useMemo(
    () => active?.issues.filter((issue) => issue.status === "open") ?? [],
    [active],
  );
  const unresolvedDisagreements = useMemo(
    () =>
      openIssues.flatMap((issue) =>
        issue.disagreements
          .filter((disagreement) => disagreement.status === "open")
          .map((disagreement) => ({ disagreement, issue })),
      ),
    [openIssues],
  );
  const responsibilityCount =
    active?.roles.reduce(
      (total, role) => total + role.responsibilities.length,
      0,
    ) ?? 0;
  const currentIssue = openIssues[0] ?? null;

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="organization-title">
        <div className={styles.heroCopy}>
          {active ? <p className={styles.eyebrow}><T>Organization</T></p> : null}
          <h1 id="organization-title">{active?.name || t("Organization")}</h1>
        </div>

        <aside
          className={styles.currentScene}
          aria-label={t("Current organization narrative")}
        >
          <span>{t(active ? "Open issues" : "Start here")}</span>
          <strong>{active ? currentIssue?.title || t("No open issue.") : t("Create an organization")}</strong>
          {currentIssue?.tension ? <p>{currentIssue.tension}</p> : null}
          <button className={styles.openOperations} type="button" onClick={() => { const operations = operationsRef.current; if (!operations) return; operations.open = true; operations.querySelector("summary")?.focus(); operations.scrollIntoView({ block: "start" }); }}><T>Open operations</T></button>
        </aside>
      </section>

      {state.organizations.length > 1 ? (
        <fieldset
          className={styles.organizationSwitcher}
          aria-label={t("Organizations")}
        >
          {state.organizations.map((organization) => (
            <button
              aria-pressed={active?.handle === organization.handle}
              key={organization.handle}
              onClick={() => setActiveHandle(organization.handle)}
              type="button"
            >
              {organization.name}
            </button>
          ))}
        </fieldset>
      ) : null}

      {active ? (
        <>
          <ChapterNav label={t("Organization chapters")} chapters={[
            { number: "01", href: "#organization-context", label: t("Intent") },
            ...(openIssues.length ? [{ number: "02", href: "#organization-issues" as const, label: t("Open issues") }] : []),
            { number: "03", href: "#organization-models", label: t("Competing models") },
            { number: "04", href: "#organization-responsibility", label: t("Responsibility") },
            ...(active.contextEvidence.length ? [{ number: "05", href: "#organization-evidence" as const, label: t("Context evidence") }] : []),
          ]} />
          <section
            className={styles.orientation}
            id="organization-context"
            aria-label={t("Organization purpose and reality")}
          >
            <article className={styles.purpose}>
              <p className={styles.eyebrow}><T>Intent</T></p>
              <h2>{active.purpose || active.name}</h2>
              <span>{active.name}</span>
            </article>
            <article className={styles.reality}>
              <p className={styles.eyebrow}><T>Reality</T></p>
              {currentIssue ? (
                <>
                  <h2>{currentIssue.observedReality}</h2>
                  <span>
                    {t(openIssues.length === 1 ? "{count} open issue" : "{count} open issues", { count: openIssues.length })}
                  </span>
                </>
              ) : (
                <h2><T>No open issues.</T></h2>
              )}
            </article>
          </section>

          {openIssues.length > 0 ? (
            <section
              className={styles.issueSection}
              id="organization-issues"
              aria-labelledby="issues-title"
            >
              <div className={styles.sectionLead}>
                <div>
                  <p className={styles.eyebrow} aria-hidden="true">02</p>
                  <h2 id="issues-title"><T>Open issues</T></h2>
                </div>
                <span>{t("{count} open", { count: openIssues.length })}</span>
              </div>
              <div className={styles.issues}>
                {openIssues.slice(0, 4).map((issue) => (
                  <article key={issue.id}>
                    <div className={styles.issueMeta}>
                      <span>{issue.createdByEmail}</span>
                      <span>
                        {new Date(issue.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                      </span>
                    </div>
                    <h3>{issue.title}</h3>
                    <p>{issue.tension}</p>
                    <details>
                      <summary><T>Reality and models</T></summary>
                      <dl>
                        <div>
                          <dt><T>Reality</T></dt>
                          <dd>{issue.observedReality}</dd>
                        </div>
                        {issue.disagreements.map((disagreement) => (
                          <div key={disagreement.id}>
                            <dt>{disagreement.raisedByEmail}</dt>
                            <dd>
                              {disagreement.statement}
                              {disagreement.reasoning
                                ? ` — ${disagreement.reasoning}`
                                : ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={styles.diagnosisSection}
              id="organization-models"
            aria-labelledby="diagnosis-title"
          >
            <div className={styles.sectionLead}>
              <div>
                <p className={styles.eyebrow} aria-hidden="true">03</p>
                <h2 aria-label={t("Competing models")} id="diagnosis-title">
                  <T>Competing models</T>
                </h2>
              </div>
              <span>{t("{count} unresolved", { count: unresolvedDisagreements.length })}</span>
            </div>
            {unresolvedDisagreements.length > 0 ? (
              <div className={styles.disagreements}>
                {unresolvedDisagreements
                  .slice(0, 4)
                  .map(({ disagreement, issue }) => (
                    <article key={disagreement.id}>
                      <span>{issue.title}</span>
                      <h3>{disagreement.statement}</h3>
                      {disagreement.reasoning ? (
                        <p>{disagreement.reasoning}</p>
                      ) : null}
                      <small>{disagreement.raisedByEmail}</small>
                    </article>
                  ))}
              </div>
            ) : (
              <div className={styles.empty}><T>No unresolved disagreements.</T></div>
            )}
          </section>

          <section
            className={styles.machineSection}
              id="organization-responsibility"
            aria-labelledby="machine-title"
          >
            <div className={styles.sectionLead}>
              <div>
                <p className={styles.eyebrow} aria-hidden="true">04</p>
                <h2 id="machine-title"><T>Roles and responsibilities</T></h2>
              </div>
              <span>
                {t("{roles} roles · {responsibilities} responsibilities · {teams} teams", {
                  roles: active.roles.length, responsibilities: responsibilityCount, teams: active.teams.length,
                })}
              </span>
            </div>
            {active.roles.length === 0 ? <p className={styles.empty}><T>No roles assigned yet.</T></p> : null}
            <div className={styles.machineGrid}>
              {active.roles.slice(0, 4).map((role) => (
                <article key={role.id}>
                  <span><T>Role</T></span>
                  <h3>{role.name}</h3>
                  {role.purpose ? <p>{role.purpose}</p> : null}
                  <details>
                    <summary><T>Scope</T></summary>
                    <dl>
                      {role.decisionScope ? (
                        <div>
                          <dt><T>Decisions</T></dt>
                          <dd>{role.decisionScope}</dd>
                        </div>
                      ) : null}
                      {role.responsibilities.map((responsibility) => (
                        <div key={responsibility.id}>
                          <dt><T>Owns</T></dt>
                          <dd>
                            {responsibility.statement}
                            {responsibility.expectedOutcome
                              ? ` → ${responsibility.expectedOutcome}`
                              : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </article>
              ))}
            </div>
          </section>

          {active.contextEvidence.length > 0 ? (
            <section
              className={styles.evidenceSection}
              id="organization-evidence"
              aria-labelledby="context-title"
            >
              <div className={styles.sectionLead}>
                <div>
                  <p className={styles.eyebrow} aria-hidden="true">05</p>
                  <h2 id="context-title"><T>Context evidence</T></h2>
                </div>
              </div>
              <div className={styles.evidenceGrid}>
                {active.contextEvidence.slice(0, 4).map((evidence) => (
                  <article key={evidence.id}>
                    <span>{evidence.context}</span>
                    <h3>{evidence.observation}</h3>
                    <details>
                      <summary><T>For / against</T></summary>
                      <p><T>Person</T>: {evidence.subjectEmail}</p>
                      <p>{t("Recorded by {email}", { email: evidence.createdByEmail })}</p>
                      <p>
                        <strong><T>For:</T></strong>{" "}
                        {evidence.evidenceFor || t("Not recorded")}
                      </p>
                      <p>
                        <strong><T>Against:</T></strong>{" "}
                        {evidence.evidenceAgainst || t("Not recorded")}
                      </p>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <details
        className={styles.operations}
        id="organization-operations"
        ref={operationsRef}
        open={!active}
      >
        <summary><T>Operations</T></summary>
        <div className={styles.legacy}>
          <OrganizationWorkspace
            activeOrganizationHandle={activeHandle}
            initialState={state}
            onActiveOrganizationChange={setActiveHandle}
            onStateChange={setState}
          />
        </div>
      </details>
    </div>
  );
}
