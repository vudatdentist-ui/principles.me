import {
  CalendarDays,
  GitBranch,
  MessageCircleQuestion,
  NotebookPen,
  Scale,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import styles from "./workspace-shell.module.css";

export type WorkspaceSection =
  | "today"
  | "goals"
  | "journal"
  | "principles"
  | "decisions"
  | "ask"
  | "explore"
  | "none";

type NavItem = {
  href: string;
  icon: ReactNode;
  label: string;
  section: WorkspaceSection;
};

const personalNavigation: NavItem[] = [
  {
    href: "/",
    icon: <CalendarDays aria-hidden="true" size={16} />,
    label: "Today",
    section: "today",
  },
  {
    href: "/goals",
    icon: <Target aria-hidden="true" size={16} />,
    label: "Goals",
    section: "goals",
  },
  {
    href: "/journal",
    icon: <NotebookPen aria-hidden="true" size={16} />,
    label: "Journal",
    section: "journal",
  },
  {
    href: "/principles",
    icon: <GitBranch aria-hidden="true" size={16} />,
    label: "Principles",
    section: "principles",
  },
];

function NavLink({ active, href, icon, label }: NavItem & { active: boolean }) {
  return (
    <a
      aria-current={active ? "page" : undefined}
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
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/">
          PRINCIPLES
        </a>

        <nav aria-label="Personal OS" className={styles.primaryNav}>
          {personalNavigation.map((item) => (
            <NavLink
              {...item}
              active={active === item.section}
              key={item.section}
            />
          ))}
        </nav>

        <nav aria-label="Personal records" className={styles.secondaryNav}>
          <NavLink
            active={active === "decisions"}
            href="/decisions"
            icon={<Scale aria-hidden="true" size={16} />}
            label="Decisions"
            section="decisions"
          />
        </nav>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.mobileBrand}>PRINCIPLES</span>
          <span className={styles.title}>{title}</span>
          <a
            aria-current={active === "ask" ? "page" : undefined}
            className={`${styles.askAction} ${active === "ask" ? styles.askActionActive : ""}`}
            href="/ask"
          >
            <MessageCircleQuestion aria-hidden="true" size={15} />
            Ask
          </a>
        </header>
        <div className={styles.content}>{children}</div>
      </section>

      <nav aria-label="Personal OS" className={styles.mobileNav}>
        {personalNavigation.map((item) => (
          <NavLink
            {...item}
            active={active === item.section}
            key={item.section}
          />
        ))}
      </nav>
    </main>
  );
}

/**
 * Presentation-only adapter for legacy workspaces that still render their own
 * app chrome. Domain behavior stays intact while the shared Personal OS shell
 * owns navigation. Remove the adapter when the feature exports a surface-only
 * component.
 */
export function LegacyWorkspaceBoundary({ children }: { children: ReactNode }) {
  return <div className={styles.legacyWorkspace}>{children}</div>;
}
