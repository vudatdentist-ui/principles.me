"use client";

import { T, useI18n } from "@/features/i18n/locale";
import { AutoTextarea } from "@/features/ui/auto-textarea";

import { jsonRequest } from "@/features/ui/json-request";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ClientOrganization, ClientOrganizationState } from "./contracts";
import styles from "./organization-workspace.module.css";


function field(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "").trim();
}

export function OrganizationWorkspace({
  activeOrganizationHandle,
  initialState,
  onActiveOrganizationChange,
  onStateChange,
}: {
  activeOrganizationHandle?: string;
  initialState: ClientOrganizationState;
  onActiveOrganizationChange?: (handle: string) => void;
  onStateChange?: (state: ClientOrganizationState) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState(initialState);
  const [internalActiveHandle, setInternalActiveHandle] = useState(
    initialState.organizations[0]?.handle ?? "",
  );
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () =>
      state.organizations.find(
        (organization) =>
          organization.handle ===
          (activeOrganizationHandle ?? internalActiveHandle),
      ) ??
      state.organizations[0] ??
      null,
    [activeOrganizationHandle, internalActiveHandle, state.organizations],
  );

  function setActiveHandle(handle: string) {
    setInternalActiveHandle(handle);
    onActiveOrganizationChange?.(handle);
  }


  async function run(label: string, action: () => Promise<void>) {
    if (working) {
      return;
    }
    setWorking(label);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Request failed."));
    } finally {
      setWorking(null);
    }
  }

  async function mutate(
    url: string,
    body: Record<string, string>,
    method: "PATCH" | "POST" = "POST",
  ): Promise<ClientOrganizationState> {
    return jsonRequest<ClientOrganizationState>(url, {
      body: JSON.stringify(body),
      method,
    });
  }

  function apply(next: ClientOrganizationState, preferredHandle?: string) {
    setState(next);
    onStateChange?.(next);
    const preferred = preferredHandle
      ? next.organizations.find((item) => item.handle === preferredHandle)
      : null;
    const retained = next.organizations.find(
      (item) =>
        item.handle === (activeOrganizationHandle ?? internalActiveHandle),
    );
    setActiveHandle(
      preferred?.handle ??
        retained?.handle ??
        next.organizations[0]?.handle ??
        "",
    );
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run("organization", async () => {
      const next = await mutate("/api/organization/workspaces", {
        name: field(form, "name"),
        purpose: field(form, "purpose"),
      });
      form.reset();
      apply(next, next.organizations.at(-1)?.handle);
    });
  }

  async function ownerMutation(
    event: FormEvent<HTMLFormElement>,
    label: string,
    url: string,
    body: (form: HTMLFormElement) => Record<string, string>,
  ) {
    event.preventDefault();
    if (!active) {
      return;
    }
    const form = event.currentTarget;
    await run(label, async () => {
      const next = await mutate(url, {
        organizationHandle: active.handle,
        ...body(form),
      });
      form.reset();
      apply(next, active.handle);
    });
  }

  async function memberMutation(
    event: FormEvent<HTMLFormElement>,
    label: string,
    url: string,
    body: (form: HTMLFormElement) => Record<string, string>,
    method: "PATCH" | "POST" = "POST",
  ) {
    event.preventDefault();
    if (!active) {
      return;
    }
    const form = event.currentTarget;
    await run(label, async () => {
      const next = await mutate(
        url,
        { organizationHandle: active.handle, ...body(form) },
        method,
      );
      form.reset();
      apply(next, active.handle);
    });
  }

  return (
    <div className={styles.shell}>

      <section className={styles.content}>

        {error ? (
          <div className={styles.error} role="alert">
            {t(error)}
          </div>
        ) : null}

        <section className={styles.organizationBar}>
          {state.organizations.length > 0 ? (
            <div className={styles.switcher}>
              {state.organizations.map((organization) => (
                <button
                  aria-pressed={active?.handle === organization.handle}
                  className={
                    active?.handle === organization.handle
                      ? styles.activeSwitch
                      : undefined
                  }
                  key={organization.handle}
                  onClick={() => setActiveHandle(organization.handle)}
                  type="button"
                >
                  {organization.name}
                </button>
              ))}
            </div>
          ) : null}
          <details
            className={styles.disclosure}
            open={state.organizations.length === 0}
          >
            <summary>
              {state.organizations.length === 0
                ? "Create organization"
                : "New organization"}
            </summary>
            <form
              className={styles.form}
              onSubmit={(event) => void createOrganization(event)}
            >
              <label>
                <T>Name</T>
                <input name="name" required maxLength={120} />
              </label>
              <label>
                <T>Purpose</T>
                <AutoTextarea name="purpose" maxLength={1200} rows={3} />
              </label>
              <button
                className={styles.primary}
                disabled={working !== null}
                type="submit"
              >
                <T>Create</T>
              </button>
            </form>
          </details>
        </section>

        {active ? (
          <OrganizationBody
            organization={active}
            working={working}
            ownerMutation={ownerMutation}
            memberMutation={memberMutation}
          />
        ) : null}
      </section>
    </div>
  );
}

function OrganizationBody({
  organization,
  working,
  ownerMutation,
  memberMutation,
}: {
  organization: ClientOrganization;
  working: string | null;
  ownerMutation: (
    event: FormEvent<HTMLFormElement>,
    label: string,
    url: string,
    body: (form: HTMLFormElement) => Record<string, string>,
  ) => Promise<void>;
  memberMutation: (
    event: FormEvent<HTMLFormElement>,
    label: string,
    url: string,
    body: (form: HTMLFormElement) => Record<string, string>,
    method?: "PATCH" | "POST",
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const owner = organization.membershipRole === "owner";

  return (
    <>
      <section className={styles.identity}>
        <div>
          <p className={styles.eyebrow}>{t(owner ? "Owner" : "Member")}</p>
          <h2>{organization.name}</h2>
        </div>
        {organization.purpose ? <p>{organization.purpose}</p> : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}><T>Machine</T></p>
          <h2><T>People, roles, responsibilities, teams.</T></h2>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <h3><T>People</T></h3>
              <span>{organization.members.length}</span>
            </div>
            <ul className={styles.list}>
              {organization.members.map((member) => (
                <li key={member.email}>
                  <strong>{member.email}</strong>
                  <span>{t(member.membershipRole)}</span>
                </li>
              ))}
            </ul>
            {owner ? (
              <details className={styles.disclosure}>
                <summary><T>Add existing account</T></summary>
                <form
                  className={styles.form}
                  onSubmit={(event) =>
                    void ownerMutation(
                      event,
                      "member",
                      "/api/organization/members",
                      (form) => ({ email: field(form, "email") }),
                    )
                  }
                >
                  <label>
                    <T>Email</T>
                    <input name="email" required type="email" />
                  </label>
                  <button disabled={working !== null} type="submit">
                    <T>Add member</T>
                  </button>
                </form>
              </details>
            ) : null}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <h3><T>Roles</T></h3>
              <span>{organization.roles.length}</span>
            </div>
            <div className={styles.stack}>
              {organization.roles.map((role) => (
                <div className={styles.item} key={role.id}>
                  <strong>{role.name}</strong>
                  {role.purpose ? <p>{role.purpose}</p> : null}
                  {role.decisionScope ? (
                    <p>
                      <b><T>Decision scope:</T></b> {role.decisionScope}
                    </p>
                  ) : null}
                  {role.memberEmails.length > 0 ? (
                    <p>
                      <b><T>People:</T></b> {role.memberEmails.join(", ")}
                    </p>
                  ) : null}
                  {role.responsibilities.length > 0 ? (
                    <ul className={styles.compactList}>
                      {role.responsibilities.map((responsibility) => (
                        <li key={responsibility.id}>
                          {responsibility.statement}
                          {responsibility.expectedOutcome
                            ? ` → ${responsibility.expectedOutcome}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {owner ? (
                    <details className={styles.disclosure}>
                      <summary><T>Edit structure</T></summary>
                      <form
                        className={styles.form}
                        onSubmit={(event) =>
                          void ownerMutation(
                            event,
                            `responsibility-${role.id}`,
                            "/api/organization/responsibilities",
                            (form) => ({
                              expectedOutcome: field(form, "expectedOutcome"),
                              roleId: role.id,
                              statement: field(form, "statement"),
                            }),
                          )
                        }
                      >
                        <label>
                          <T>Responsibility</T>
                          <input name="statement" required />
                        </label>
                        <label>
                          <T>Expected outcome</T>
                          <input name="expectedOutcome" />
                        </label>
                        <button disabled={working !== null} type="submit">
                          <T>Add responsibility</T>
                        </button>
                      </form>
                      <form
                        className={styles.form}
                        onSubmit={(event) =>
                          void ownerMutation(
                            event,
                            `role-assignment-${role.id}`,
                            "/api/organization/role-assignments",
                            (form) => ({
                              email: field(form, "email"),
                              roleId: role.id,
                            }),
                          )
                        }
                      >
                        <label>
                          <T>Assign member</T>
                          <select name="email" required defaultValue="">
                            <option value="" disabled>
                              {t("Select")}
                            </option>
                            {organization.members.map((member) => (
                              <option key={member.email} value={member.email}>
                                {member.email}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button disabled={working !== null} type="submit">
                          <T>Assign role</T>
                        </button>
                      </form>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
            {owner ? (
              <details className={styles.disclosure}>
                <summary><T>New role</T></summary>
                <form
                  className={styles.form}
                  onSubmit={(event) =>
                    void ownerMutation(
                      event,
                      "role",
                      "/api/organization/roles",
                      (form) => ({
                        decisionScope: field(form, "decisionScope"),
                        name: field(form, "name"),
                        purpose: field(form, "purpose"),
                      }),
                    )
                  }
                >
                  <label>
                    <T>Name</T>
                    <input name="name" required />
                  </label>
                  <label>
                    <T>Purpose</T>
                    <AutoTextarea name="purpose" rows={2} />
                  </label>
                  <label>
                    <T>Decision scope</T>
                    <AutoTextarea name="decisionScope" rows={2} />
                  </label>
                  <button disabled={working !== null} type="submit">
                    <T>Create role</T>
                  </button>
                </form>
              </details>
            ) : null}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <h3><T>Teams</T></h3>
              <span>{organization.teams.length}</span>
            </div>
            <div className={styles.stack}>
              {organization.teams.map((team) => (
                <div className={styles.item} key={team.id}>
                  <strong>{team.name}</strong>
                  {team.purpose ? <p>{team.purpose}</p> : null}
                  {team.memberEmails.length > 0 ? (
                    <p>{team.memberEmails.join(", ")}</p>
                  ) : null}
                  {owner ? (
                    <form
                      className={styles.inlineForm}
                      onSubmit={(event) =>
                        void ownerMutation(
                          event,
                          `team-${team.id}`,
                          "/api/organization/team-members",
                          (form) => ({
                            email: field(form, "email"),
                            teamId: team.id,
                          }),
                        )
                      }
                    >
                      <select name="email" required defaultValue="">
                        <option value="" disabled>
                          <T>Add</T> member
                        </option>
                        {organization.members.map((member) => (
                          <option key={member.email} value={member.email}>
                            {member.email}
                          </option>
                        ))}
                      </select>
                      <button disabled={working !== null} type="submit">
                        Add
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
            {owner ? (
              <details className={styles.disclosure}>
                <summary><T>New team</T></summary>
                <form
                  className={styles.form}
                  onSubmit={(event) =>
                    void ownerMutation(
                      event,
                      "team",
                      "/api/organization/teams",
                      (form) => ({
                        name: field(form, "name"),
                        purpose: field(form, "purpose"),
                      }),
                    )
                  }
                >
                  <label>
                    Name
                    <input name="name" required />
                  </label>
                  <label>
                    Purpose
                    <AutoTextarea name="purpose" rows={2} />
                  </label>
                  <button disabled={working !== null} type="submit">
                    <T>Create team</T>
                  </button>
                </form>
              </details>
            ) : null}
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}><T>Reality</T></p>
          <h2><T>Surface issues and disagreement.</T></h2>
        </div>
        <details className={styles.disclosure}>
          <summary><T>Record issue</T></summary>
          <form
            className={styles.form}
            onSubmit={(event) =>
              void memberMutation(
                event,
                "issue",
                "/api/organization/issues",
                (form) => ({
                  observedReality: field(form, "observedReality"),
                  tension: field(form, "tension"),
                  title: field(form, "title"),
                }),
              )
            }
          >
            <label>
              <T>Issue</T>
              <input name="title" required />
            </label>
            <label>
              <T>Observed reality</T>
              <AutoTextarea name="observedReality" required rows={3} />
            </label>
            <label>
              <T>Tension</T>
              <AutoTextarea name="tension" required rows={3} />
            </label>
            <button
              className={styles.primary}
              disabled={working !== null}
              type="submit"
            >
              <T>Record</T>
            </button>
          </form>
        </details>

        <div className={styles.stack}>
          {organization.issues.map((issue) => (
            <article className={styles.issue} key={issue.id}>
              <div className={styles.cardHeading}>
                <h3>{issue.title}</h3>
                <span>{t(issue.status)}</span>
              </div>
              <p>{issue.observedReality}</p>
              <p>
                <b><T>Tension:</T></b> {issue.tension}
              </p>
              <p className={styles.meta}>{t("Raised by {email}", { email: issue.createdByEmail })}</p>
              {issue.resolution ? (
                <p>
                  <b><T>Resolution:</T></b> {issue.resolution}
                </p>
              ) : null}

              {issue.disagreements.length > 0 ? (
                <div className={styles.disagreements}>
                  {issue.disagreements.map((disagreement) => (
                    <div className={styles.item} key={disagreement.id}>
                      <strong>{disagreement.raisedByEmail}</strong>
                      <p>{disagreement.statement}</p>
                      {disagreement.reasoning ? (
                        <p>{disagreement.reasoning}</p>
                      ) : null}
                      {disagreement.resolution ? (
                        <p>
                          <b><T>Resolution:</T></b> {disagreement.resolution}
                        </p>
                      ) : null}
                      {owner && disagreement.status === "open" ? (
                        <form
                          className={styles.inlineForm}
                          onSubmit={(event) =>
                            void memberMutation(
                              event,
                              `resolve-disagreement-${disagreement.id}`,
                              "/api/organization/disagreements",
                              (form) => ({
                                disagreementId: disagreement.id,
                                resolution: field(form, "resolution"),
                              }),
                              "PATCH",
                            )
                          }
                        >
                          <input
                            name="resolution"
                            placeholder={t("Resolution")}
                            required
                          />
                          <button disabled={working !== null} type="submit">
                            <T>Resolve</T>
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {issue.status === "open" ? (
                <details className={styles.disclosure}>
                  <summary><T>Disagree</T></summary>
                  <form
                    className={styles.form}
                    onSubmit={(event) =>
                      void memberMutation(
                        event,
                        `disagreement-${issue.id}`,
                        "/api/organization/disagreements",
                        (form) => ({
                          issueId: issue.id,
                          reasoning: field(form, "reasoning"),
                          statement: field(form, "statement"),
                        }),
                      )
                    }
                  >
                    <label>
                      <T>What do you disagree with?</T>
                      <AutoTextarea name="statement" required rows={2} />
                    </label>
                    <label>
                      <T>Reasoning</T>
                      <AutoTextarea name="reasoning" rows={2} />
                    </label>
                    <button disabled={working !== null} type="submit">
                      <T>Raise disagreement</T>
                    </button>
                  </form>
                </details>
              ) : null}

              {owner && issue.status === "open" ? (
                <form
                  className={styles.inlineForm}
                  onSubmit={(event) =>
                    void memberMutation(
                      event,
                      `resolve-issue-${issue.id}`,
                      "/api/organization/issues",
                      (form) => ({
                        issueId: issue.id,
                        resolution: field(form, "resolution"),
                      }),
                      "PATCH",
                    )
                  }
                >
                  <input
                    name="resolution"
                    placeholder={t("Resolve issue")}
                    required
                  />
                  <button disabled={working !== null} type="submit">
                    <T>Resolve</T>
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}><T>Context</T></p>
          <h2><T>Track record without a people score.</T></h2>
        </div>
        <details className={styles.disclosure}>
          <summary><T>Add context evidence</T></summary>
          <form
            className={styles.form}
            onSubmit={(event) =>
              void memberMutation(
                event,
                "context",
                "/api/organization/context-evidence",
                (form) => ({
                  context: field(form, "context"),
                  email: field(form, "email"),
                  evidenceAgainst: field(form, "evidenceAgainst"),
                  evidenceFor: field(form, "evidenceFor"),
                  observation: field(form, "observation"),
                }),
              )
            }
          >
            <label>
              <T>Person</T>
              <select name="email" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                {organization.members.map((member) => (
                  <option key={member.email} value={member.email}>
                    {member.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <T>Context</T>
              <input
                name="context"
                required
                placeholder={t("e.g. hiring senior engineers")}
              />
            </label>
            <label>
              <T>Observation</T>
              <AutoTextarea name="observation" required rows={3} />
            </label>
            <label>
              <T>Evidence for</T>
              <AutoTextarea name="evidenceFor" rows={2} />
            </label>
            <label>
              <T>Evidence against</T>
              <AutoTextarea name="evidenceAgainst" rows={2} />
            </label>
            <button
              className={styles.primary}
              disabled={working !== null}
              type="submit"
            >
              <T>Record evidence</T>
            </button>
          </form>
        </details>
        <div className={styles.stack}>
          {organization.contextEvidence.map((item) => (
            <article className={styles.contextItem} key={item.id}>
              <div className={styles.cardHeading}>
                <h3>{item.subjectEmail}</h3>
                <span>{item.context}</span>
              </div>
              <p>{item.observation}</p>
              {item.evidenceFor ? (
                <p>
                  <b><T>For:</T></b> {item.evidenceFor}
                </p>
              ) : null}
              {item.evidenceAgainst ? (
                <p>
                  <b><T>Against:</T></b> {item.evidenceAgainst}
                </p>
              ) : null}
              <p className={styles.meta}>{t("Recorded by {email}", { email: item.createdByEmail })}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
