import { Compass, GitBranch, ListChecks, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./decision-workspace.module.css";

type WorkspaceSection = "ask" | "decisions" | "principles" | "explore";

function NavLink({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
      href={href}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function WorkspaceShell({
  active,
  children,
  title,
}: {
  active: WorkspaceSection;
  children: ReactNode;
  title: string;
}) {
  return (
    <main className={styles.app}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/">
          <span aria-hidden="true" className={styles.brandMark} />
          <span>PRINCIPLES</span>
        </a>
        <nav aria-label="Main navigation" className={styles.nav}>
          <NavLink
            active={active === "ask"}
            href="/"
            icon={<Sparkles size={16} />}
            label="Ask"
          />
          <NavLink
            active={active === "decisions"}
            href="/decisions"
            icon={<ListChecks size={16} />}
            label="Decisions"
          />
          <NavLink
            active={active === "principles"}
            href="/principles"
            icon={<GitBranch size={16} />}
            label="My Principles"
          />
          <NavLink
            active={active === "explore"}
            href="/explore"
            icon={<Compass size={16} />}
            label="Explore"
          />
        </nav>
        <div className={styles.sidebarFooter}>
          <strong>Your Workspace</strong>
          Private decisions · persistent judgment memory
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>{title}</span>
          <span className={styles.topbarStatus}>
            <span className={styles.statusDot} /> PostgreSQL workspace
          </span>
        </header>
        <div className={styles.content}>{children}</div>
      </section>

      <nav aria-label="Mobile navigation" className={styles.mobileNav}>
        <a href="/">Ask</a>
        <a href="/decisions">Decisions</a>
        <a href="/principles">Principles</a>
        <a href="/explore">Explore</a>
      </nav>
    </main>
  );
}
