import { notFound } from "next/navigation";
import { JournalEntryView } from "@/components/journal/journal-entry";
import styles from "@/components/journal/journal.module.css";
import { getJournalEntryDetail } from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

type PageProps = { params: Promise<{ id: string }> };

export default async function JournalEntryPage({ params }: PageProps) {
  const [{ id }, workspaceUser] = await Promise.all([
    params,
    getWorkspaceUser(),
  ]);
  const detail = await getJournalEntryDetail({ id, userId: workspaceUser.id });
  if (!detail) {
    notFound();
  }

  const occurredAt = new Date(detail.entry.occurredAt).toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div>
            <a className={styles.link} href="/journal">
              ← Journal
            </a>
            <div className={styles.dayLabel}>{occurredAt}</div>
          </div>
          <a className={styles.link} href="/principles">
            Principles
          </a>
        </header>
        <JournalEntryView
          candidate={detail.candidate}
          entry={detail.entry}
          principles={detail.principles}
          reflection={detail.reflection}
        />
      </div>
    </main>
  );
}
