"use client";

import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppTab = "people" | "organization" | "knowledge" | "learning";

const tabs: Array<{ href: string; key: AppTab; label: string }> = [
  { href: "/", key: "people", label: "People" },
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
  activeTab: AppTab;
  children: ReactNode;
  email: string;
  workspaceName?: string;
}) {
  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <a className={styles.brand} href="/" aria-label="Principles home">
            Principles
          </a>
          <div className={styles.account}>
            <span className={styles.accountMeta}>{workspaceName}</span>
            <span className={styles.accountMeta}>{email}</span>
            <button className={styles.signOut} onClick={() => void signOut()} type="button">
              Sign out
            </button>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Primary">
          {tabs.map((tab) => (
            <a
              aria-current={activeTab === tab.key ? "page" : undefined}
              className={activeTab === tab.key ? styles.activeTab : undefined}
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
