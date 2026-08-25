"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  ClientOrganization,
  ClientOrganizationState,
} from "./contracts";
import styles from "./organization-workspace.module.css";

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }
  if (!payload) {
    throw new Error("Request failed.");
  }
  return payload;
}

function field(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "").trim();
}

export function OrganizationWorkspace({
  email,
  initialState,
}: {
  email: string;
  initialState: ClientOrganizationState;
}) {
  const [state, setState] = useState(initialState);
  const [activeHandle, setActiveHandle] = useState(
    initialState.organizations[0]?.handle ?? ""
  );
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () =>
      state.organizations.find((organization) => organization.handle === activeHandle) ??
      state.organizations[0] ??
      null,
    [activeHandle, state.organizations]
  );

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
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
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setWorking(null);
    }
  }

  async function mutate(
    url: string,
    body: Record<string, string>,
    method: "PATCH" | "POST" = "POST"
  ): Promise<ClientOrganizationState> {
    return jsonRequest<ClientOrganizationState>(url, {
      body: JSON.stringify(body),
      method,
    });
  }

  function apply(next: ClientOrganizationState, preferredHandle?: string) {
    setState(next);
    const preferred = preferredHandle
      ? next.organizations.find((item) => item.handle === preferredHandle)
      : null;
    const retained = next.organizations.find((item) => item.handle === activeHandle);
    setActiveHandle(preferred?.handle ?? retained?.handle ?? next.organizations[0]?.handle ?? "");
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
    body: (form: HTMLFormElement) => Record<string, string>
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
    method: "PATCH" | "POST" = "POST"
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
        method
      );
      form.reset();
      apply(next, active.handle);
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/">Principles</a>
        <nav className={styles.nav} aria-label="Primary">
          <a href="/">People</a>
          <a href="/knowledge">Knowledge</a>
          <a href="/learning">Learning</a>
          <a aria-current="page" href="/organization">Organization</a>
        </nav>
        <div className={styles.account}>
          <span>{email}</span>
          <button onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Principles for Organizations</p>
          <h1>Design the machine together.</h1>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        <section className={styles.organizationBar}>
          {state.organizations.length > 0 ? (
            <div className={styles.switcher} aria-label="Organizations" role="group">
              {state.organizations.map((organization) => (
                <button
                  aria-pressed={active?.handle === organization.handle}
                  className={active?.handle === organization.handle ? styles.activeSwitch : undefined}
                  key={organization.handle}
                  onClick={() => setActiveHandle(organization.handle)}
                  type="button"
                >
                  {organization.name}
                </button>
              ))}
            </div>
          ) : null}
          <details className={styles.disclosure} open={state.organizations.length === 0}>
            <summary>{state.organizations.length === 0 ? "Create organization" : "New organization"}</summary>
            <form className={styles.form} onSubmit={(event) => void createOrganization(event)}>
              <label>Name<input name="name" required maxLength={120} /></label>
              <label>Purpose<textarea name="purpose" maxLength={1200} rows={3} /></label>
              <button className={styles.primary} disabled={working !== null} type="submit">
                Create
              </button>
            </form>
          </details>
        </section>

        {active ? <OrganizationBody organization={active} working={working} ownerMutation={ownerMutation} memberMutation={memberMutation} /> : null}
      </section>
    </main>
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
    body: (form: HTMLFormElement) => Record<string, string>
  ) => Promise<void>;
  memberMutation: (
    event: FormEvent<HTMLFormElement>,
    label: string,
    url: string,
    body: (form: HTMLFormElement) => Record<string, string>,
    method?: "PATCH" | "POST"
  ) => Promise<void>;
}) {
  const owner = organization.membershipRole === "owner";

  return (
    <>
      <section className={styles.identity}>
        <div>
          <p className={styles.eyebrow}>{owner ? "Owner" : "Member"}</p>
          <h2>{organization.name}</h2>
        </div>
        {organization.purpose ? <p>{organization.purpose}</p> : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Machine</p>
          <h2>People, roles, responsibilities, teams.</h2>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHeading}><h3>People</h3><span>{organization.members.length}</span></div>
            <ul className={styles.list}>
              {organization.members.map((member) => (
                <li key={member.email}><strong>{member.email}</strong><span>{member.membershipRole}</span></li>
              ))}
            </ul>
            {owner ? (
              <details className={styles.disclosure}>
                <summary>Add existing account</summary>
                <form className={styles.form} onSubmit={(event) => void ownerMutation(event, "member", "/api/organization/members", (form) => ({ email: field(form, "email") }))}>
                  <label>Email<input name="email" required type="email" /></label>
                  <button disabled={working !== null} type="submit">Add member</button>
                </form>
              </details>
            ) : null}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}><h3>Roles</h3><span>{organization.roles.length}</span></div>
            <div className={styles.stack}>
              {organization.roles.map((role) => (
                <div className={styles.item} key={role.id}>
                  <strong>{role.name}</strong>
                  {role.purpose ? <p>{role.purpose}</p> : null}
                  {role.decisionScope ? <p><b>Decision scope:</b> {role.decisionScope}</p> : null}
                  {role.memberEmails.length > 0 ? <p><b>People:</b> {role.memberEmails.join(", ")}</p> : null}
                  {role.responsibilities.length > 0 ? (
                    <ul className={styles.compactList}>
                      {role.responsibilities.map((responsibility) => (
                        <li key={responsibility.id}>{responsibility.statement}{responsibility.expectedOutcome ? ` → ${responsibility.expectedOutcome}` : ""}</li>
                      ))}
                    </ul>
                  ) : null}
                  {owner ? (
                    <details className={styles.disclosure}>
                      <summary>Edit structure</summary>
                      <form className={styles.form} onSubmit={(event) => void ownerMutation(event, `responsibility-${role.id}`, "/api/organization/responsibilities", (form) => ({ expectedOutcome: field(form, "expectedOutcome"), roleId: role.id, statement: field(form, "statement") }))}>
                        <label>Responsibility<input name="statement" required /></label>
                        <label>Expected outcome<input name="expectedOutcome" /></label>
                        <button disabled={working !== null} type="submit">Add responsibility</button>
                      </form>
                      <form className={styles.form} onSubmit={(event) => void ownerMutation(event, `role-assignment-${role.id}`, "/api/organization/role-assignments", (form) => ({ email: field(form, "email"), roleId: role.id }))}>
                        <label>Assign member<select name="email" required defaultValue=""><option value="" disabled>Select</option>{organization.members.map((member) => <option key={member.email} value={member.email}>{member.email}</option>)}</select></label>
                        <button disabled={working !== null} type="submit">Assign role</button>
                      </form>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
            {owner ? (
              <details className={styles.disclosure}>
                <summary>New role</summary>
                <form className={styles.form} onSubmit={(event) => void ownerMutation(event, "role", "/api/organization/roles", (form) => ({ decisionScope: field(form, "decisionScope"), name: field(form, "name"), purpose: field(form, "purpose") }))}>
                  <label>Name<input name="name" required /></label>
                  <label>Purpose<textarea name="purpose" rows={2} /></label>
                  <label>Decision scope<textarea name="decisionScope" rows={2} /></label>
                  <button disabled={working !== null} type="submit">Create role</button>
                </form>
              </details>
            ) : null}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}><h3>Teams</h3><span>{organization.teams.length}</span></div>
            <div className={styles.stack}>
              {organization.teams.map((team) => (
                <div className={styles.item} key={team.id}>
                  <strong>{team.name}</strong>
                  {team.purpose ? <p>{team.purpose}</p> : null}
                  {team.memberEmails.length > 0 ? <p>{team.memberEmails.join(", ")}</p> : null}
                  {owner ? (
                    <form className={styles.inlineForm} onSubmit={(event) => void ownerMutation(event, `team-${team.id}`, "/api/organization/team-members", (form) => ({ email: field(form, "email"), teamId: team.id }))}>
                      <select name="email" required defaultValue=""><option value="" disabled>Add member</option>{organization.members.map((member) => <option key={member.email} value={member.email}>{member.email}</option>)}</select>
                      <button disabled={working !== null} type="submit">Add</button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
            {owner ? (
              <details className={styles.disclosure}>
                <summary>New team</summary>
                <form className={styles.form} onSubmit={(event) => void ownerMutation(event, "team", "/api/organization/teams", (form) => ({ name: field(form, "name"), purpose: field(form, "purpose") }))}>
                  <label>Name<input name="name" required /></label>
                  <label>Purpose<textarea name="purpose" rows={2} /></label>
                  <button disabled={working !== null} type="submit">Create team</button>
                </form>
              </details>
            ) : null}
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Reality</p>
          <h2>Surface issues and disagreement.</h2>
        </div>
        <details className={styles.disclosure}>
          <summary>Record issue</summary>
          <form className={styles.form} onSubmit={(event) => void memberMutation(event, "issue", "/api/organization/issues", (form) => ({ observedReality: field(form, "observedReality"), tension: field(form, "tension"), title: field(form, "title") }))}>
            <label>Issue<input name="title" required /></label>
            <label>Observed reality<textarea name="observedReality" required rows={3} /></label>
            <label>Tension<textarea name="tension" required rows={3} /></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Record</button>
          </form>
        </details>

        <div className={styles.stack}>
          {organization.issues.map((issue) => (
            <article className={styles.issue} key={issue.id}>
              <div className={styles.cardHeading}><h3>{issue.title}</h3><span>{issue.status}</span></div>
              <p>{issue.observedReality}</p>
              <p><b>Tension:</b> {issue.tension}</p>
              <p className={styles.meta}>Raised by {issue.createdByEmail}</p>
              {issue.resolution ? <p><b>Resolution:</b> {issue.resolution}</p> : null}

              {issue.disagreements.length > 0 ? (
                <div className={styles.disagreements}>
                  {issue.disagreements.map((disagreement) => (
                    <div className={styles.item} key={disagreement.id}>
                      <strong>{disagreement.raisedByEmail}</strong>
                      <p>{disagreement.statement}</p>
                      {disagreement.reasoning ? <p>{disagreement.reasoning}</p> : null}
                      {disagreement.resolution ? <p><b>Resolution:</b> {disagreement.resolution}</p> : null}
                      {owner && disagreement.status === "open" ? (
                        <form className={styles.inlineForm} onSubmit={(event) => void memberMutation(event, `resolve-disagreement-${disagreement.id}`, "/api/organization/disagreements", (form) => ({ disagreementId: disagreement.id, resolution: field(form, "resolution") }), "PATCH")}>
                          <input name="resolution" placeholder="Resolution" required />
                          <button disabled={working !== null} type="submit">Resolve</button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {issue.status === "open" ? (
                <details className={styles.disclosure}>
                  <summary>Disagree</summary>
                  <form className={styles.form} onSubmit={(event) => void memberMutation(event, `disagreement-${issue.id}`, "/api/organization/disagreements", (form) => ({ issueId: issue.id, reasoning: field(form, "reasoning"), statement: field(form, "statement") }))}>
                    <label>What do you disagree with?<textarea name="statement" required rows={2} /></label>
                    <label>Reasoning<textarea name="reasoning" rows={2} /></label>
                    <button disabled={working !== null} type="submit">Raise disagreement</button>
                  </form>
                </details>
              ) : null}

              {owner && issue.status === "open" ? (
                <form className={styles.inlineForm} onSubmit={(event) => void memberMutation(event, `resolve-issue-${issue.id}`, "/api/organization/issues", (form) => ({ issueId: issue.id, resolution: field(form, "resolution") }), "PATCH")}>
                  <input name="resolution" placeholder="Resolve issue" required />
                  <button disabled={working !== null} type="submit">Resolve</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Context</p>
          <h2>Track record without a people score.</h2>
        </div>
        <details className={styles.disclosure}>
          <summary>Add context evidence</summary>
          <form className={styles.form} onSubmit={(event) => void memberMutation(event, "context", "/api/organization/context-evidence", (form) => ({ context: field(form, "context"), email: field(form, "email"), evidenceAgainst: field(form, "evidenceAgainst"), evidenceFor: field(form, "evidenceFor"), observation: field(form, "observation") }))}>
            <label>Person<select name="email" required defaultValue=""><option value="" disabled>Select</option>{organization.members.map((member) => <option key={member.email} value={member.email}>{member.email}</option>)}</select></label>
            <label>Context<input name="context" required placeholder="e.g. hiring senior engineers" /></label>
            <label>Observation<textarea name="observation" required rows={3} /></label>
            <label>Evidence for<textarea name="evidenceFor" rows={2} /></label>
            <label>Evidence against<textarea name="evidenceAgainst" rows={2} /></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Record evidence</button>
          </form>
        </details>
        <div className={styles.stack}>
          {organization.contextEvidence.map((item) => (
            <article className={styles.contextItem} key={item.id}>
              <div className={styles.cardHeading}><h3>{item.subjectEmail}</h3><span>{item.context}</span></div>
              <p>{item.observation}</p>
              {item.evidenceFor ? <p><b>For:</b> {item.evidenceFor}</p> : null}
              {item.evidenceAgainst ? <p><b>Against:</b> {item.evidenceAgainst}</p> : null}
              <p className={styles.meta}>Recorded by {item.createdByEmail}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
