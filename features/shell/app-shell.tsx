"use client";

import { LanguageSwitcher, T, useI18n } from "@/features/i18n/locale";
import { useRef, useState, type ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppTab = "people" | "organization" | "knowledge" | "learning";

const tabs: Array<{ href: string; key: AppTab; label: string }> = [
  { href: "/", key: "people", label: "Me" },
  { href: "/organization", key: "organization", label: "Organization" },
  { href: "/knowledge", key: "knowledge", label: "Knowledge" },
  { href: "/learning", key: "learning", label: "Learning" },
];

export function AppShell({
  activeTab,
  children,
  email,
  workspaceName = "Personal",
}: {
  activeTab?: AppTab;
  children: ReactNode;
  email: string;
  workspaceName?: string;
}) {
  const { t } = useI18n();
  const pending = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setSigningOut(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) throw new Error(t("Could not sign out. Try again."));
      window.location.assign("/");
    } catch {
      setError(t("Could not sign out. Try again."));
      pending.current = false;
      setSigningOut(false);
    }
  }

  const displayedWorkspace =
    workspaceName === "Personal" ? t("Personal") : workspaceName;

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main-content">
        <T>Skip to content</T>
      </a>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <a className={styles.brand} href="/" aria-label={t("Principles home")}>
            Principles
          </a>

          <nav className={styles.nav} aria-label={t("Primary")}>
            {tabs.map((tab) => (
              <a
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={activeTab === tab.key ? styles.activeTab : undefined}
                href={tab.href}
                key={tab.key}
              >
                <T>{tab.label}</T>
              </a>
            ))}
          </nav>

          <div className={styles.account}>
            <LanguageSwitcher className={styles.languageSelect} />
            <span className={styles.workspaceName} title={displayedWorkspace}>
              {displayedWorkspace}
            </span>
            <span className={styles.accountEmail} title={email}>
              {email}
            </span>
            <a
              className={styles.accountLink}
              href="/account"
              aria-label={t("Account for {email}", { email })}
            >
              <T>Account</T>
            </a>
            <button
              className={styles.signOut}
              disabled={signingOut}
              onClick={() => void signOut()}
              type="button"
            >
              {signingOut ? t("Signing out...") : t("Sign out")}
            </button>
          </div>
        </div>
      </header>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <main className={styles.main} id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
