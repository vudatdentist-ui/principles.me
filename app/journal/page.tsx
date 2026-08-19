import { Suspense } from "react";
import styles from "@/components/journal/journal.module.css";
import { JournalList } from "@/components/journal/journal-list";
import { WorkspaceShell } from "@/components/workspace-shell";
import { listJournalEntries } from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

async function JournalRoute() {
  const workspaceUser = await getWorkspaceUser();
  const entries = await listJournalEntries(workspaceUser.id);
  return (
    <div className={styles.frame}>
      <JournalList entries={entries} />
    </div>
  );
}

export default function JournalPage() {
  return (
    <WorkspaceShell active="journal" title="Journal">
      <Suspense fallback={null}>
        <JournalRoute />
      </Suspense>
    </WorkspaceShell>
  );
}
