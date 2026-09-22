"use client";

import { T, useI18n } from "@/features/i18n/locale";
import { type FormEvent, useState } from "react";
import styles from "./account-controls.module.css";

type OwnedOrganization = {
  handle: string | null;
  name: string;
};

function filenameFromDisposition(value: string | null): string {
  const match = value?.match(/filename="([^"]+)"/i);
  return (
    match?.[1] ||
    `principles-export-${new Date().toISOString().slice(0, 10)}.json`
  );
}

export function AccountControls({ email }: { email: string }) {
  const { t } = useI18n();
  const [exportPassword, setExportPassword] = useState("");
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteOwnedOrganizations, setDeleteOwnedOrganizations] =
    useState(false);
  const [ownedOrganizations, setOwnedOrganizations] = useState<
    OwnedOrganization[]
  >([]);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteConfirmation = t("DELETE MY ACCOUNT");

  async function exportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExporting(true);
    setExportStatus(null);
    try {
      const response = await fetch("/api/account/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: exportPassword }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setExportStatus(body?.error || t("Export failed."));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromDisposition(
        response.headers.get("content-disposition"),
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportPassword("");
      setExportStatus(t("Export ready."));
    } catch (cause) {
      setExportStatus(
        cause instanceof Error ? t(cause.message) : t("Export failed."),
      );
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmation:
            confirmation === deleteConfirmation ? "DELETE MY ACCOUNT" : confirmation,
          deleteOwnedOrganizations,
          password: deletePassword,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        code?: string;
        error?: string;
        organizations?: OwnedOrganization[];
      } | null;
      if (
        response.status === 409 &&
        body?.code === "OWNED_ORGANIZATIONS_REQUIRE_CONFIRMATION"
      ) {
        setOwnedOrganizations(body.organizations ?? []);
        setDeleteStatus(
          body.error || t("Owned organizations require explicit confirmation."),
        );
        return;
      }
      if (!response.ok) {
        setDeleteStatus(body?.error || t("Account deletion failed."));
        return;
      }
      window.location.href = "/";
    } catch (cause) {
      setDeleteStatus(
        cause instanceof Error ? t(cause.message) : t("Account deletion failed."),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.accountPage}>
      <header className={styles.intro}>
        <p className={styles.kicker}><T>Account</T></p>
        <h1><T>Account & data</T></h1>
        <p className={styles.identity}>{email}</p>
      </header>

      <section className={styles.section} aria-labelledby="export-heading">
        <div className={styles.sectionCopy}>
          <h2 id="export-heading"><T>Export your data</T></h2>
          <p>
            <T>Get your personal evolution history and your attributable organization participation. Credentials and session/reset tokens are never included.</T>
          </p>
        </div>
        <form
          className={styles.form}
          onSubmit={(event) => void exportData(event)}
        >
          <label htmlFor="export-password"><T>Confirm password</T></label>
          <input
            autoComplete="current-password"
            id="export-password"
            onChange={(event) => setExportPassword(event.target.value)}
            required
            type="password"
            value={exportPassword}
          />
          <button
            disabled={exporting || exportPassword.length === 0}
            type="submit"
          >
            {exporting ? t("Preparing…") : t("Export data")}
          </button>
          {exportStatus ? (
            <p className={styles.status} role="status">
              {t(exportStatus)}
            </p>
          ) : null}
        </form>
      </section>

      <section
        className={`${styles.section} ${styles.danger}`}
        aria-labelledby="delete-heading"
      >
        <div className={styles.sectionCopy}>
          <h2 id="delete-heading"><T>Delete account</T></h2>
          <p>
            <T>This permanently deletes your Personal Workspace. Shared organization history keeps a disabled pseudonymous identity when other members still depend on that history.</T>
          </p>
        </div>
        <form
          className={styles.form}
          onSubmit={(event) => void deleteAccount(event)}
        >
          <label htmlFor="delete-password"><T>Confirm password</T></label>
          <input
            autoComplete="current-password"
            id="delete-password"
            onChange={(event) => setDeletePassword(event.target.value)}
            required
            type="password"
            value={deletePassword}
          />

          <label htmlFor="delete-confirmation">
            <T>Type exactly</T> <strong>{deleteConfirmation}</strong>
          </label>
          <input
            autoComplete="off"
            id="delete-confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="text"
            value={confirmation}
          />

          {ownedOrganizations.length > 0 ? (
            <div className={styles.organizationWarning}>
              <p>
                <T>You own organizations that will otherwise block account deletion:</T>
              </p>
              <ul>
                {ownedOrganizations.map((organization) => (
                  <li key={organization.handle ?? organization.name}>
                    {organization.name}
                    {organization.handle ? ` · ${organization.handle}` : ""}
                  </li>
                ))}
              </ul>
              <label className={styles.checkbox}>
                <input
                  checked={deleteOwnedOrganizations}
                  onChange={(event) =>
                    setDeleteOwnedOrganizations(event.target.checked)
                  }
                  type="checkbox"
                />
                <T>Also permanently delete these organizations and their data.</T>
              </label>
            </div>
          ) : null}

          <button
            className={styles.deleteButton}
            disabled={
              deleting ||
              confirmation !== deleteConfirmation ||
              deletePassword.length === 0 ||
              (ownedOrganizations.length > 0 && !deleteOwnedOrganizations)
            }
            type="submit"
          >
            {deleting ? t("Deleting…") : t("Delete account")}
          </button>
          {deleteStatus ? (
            <p className={styles.status} role="status">
              {t(deleteStatus)}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
