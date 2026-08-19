import { Suspense } from "react";
import styles from "@/components/journal/journal.module.css";
import { JournalList } from "@/components/journal/journal-list";
import { listJournalEntries } from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

async function JournalRoute() {
  const workspaceUser = await getWorkspaceUser();
  const entries = await listJournalEntries(workspaceUser.id);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <h1 className={styles.title}>Journal</h1>
          <div className={styles.headerActions}>
            <a className={styles.link} href="/principles">
              Principles
            </a>
          </div>
        </header>
        <JournalList entries={entries} />
      </div>
    </main>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalRoute />
    </Suspense>
  );
}
