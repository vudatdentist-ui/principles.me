import { Brain, CheckCircle2, GitBranch, ListChecks } from "lucide-react";
import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getPersonalBrainSummary } from "@/lib/db/personal-brain-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";
import styles from "./personal-brain.module.css";

async function PersonalBrainContent() {
  const workspaceUser = await getWorkspaceUser();
  const summary = await getPersonalBrainSummary(workspaceUser.id);

  return (
    <section className={styles.page} data-testid="personal-brain-dashboard">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Your judgment memory</span>
          <h1>Personal Brain</h1>
          <p>
            A data-backed view of what you have decided, kept, reused, and
            reviewed.
          </p>
        </div>
        <Brain size={30} />
      </div>

      <div className={styles.metrics}>
        <article data-testid="brain-principles">
          <GitBranch size={18} />
          <strong>{summary.principleCount}</strong>
          <span>principles</span>
        </article>
        <article data-testid="brain-decisions">
          <ListChecks size={18} />
          <strong>{summary.decisionCount}</strong>
          <span>decisions</span>
        </article>
        <article data-testid="brain-reviews">
          <CheckCircle2 size={18} />
          <strong>{summary.reviewCount}</strong>
          <span>reviews</span>
        </article>
        <article data-testid="brain-reused">
          <Brain size={18} />
          <strong>{summary.principlesReused}</strong>
          <span>principles reused</span>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h2>Decision states</h2>
          <div className={styles.stateList}>
            {Object.entries(summary.statusCounts).map(([status, count]) => (
              <div key={status}>
                <span>{status.replace("_", " ")}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h2>Principles that are compounding</h2>
          {summary.reusedPrinciples.length ? (
            <div className={styles.reuseList}>
              {summary.reusedPrinciples.map((item) => (
                <div key={item.id}>
                  <strong>“{item.statement}”</strong>
                  <span>
                    Applied in {item.timesApplied} later decision
                    {item.timesApplied === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              No principle has been reused yet. Apply a prior principle from a
              new Decision to start compounding your memory.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

export default function PersonalBrainPage() {
  return (
    <WorkspaceShell active="explore" title="Personal Brain">
      <Suspense fallback={<div>Loading your judgment memory…</div>}>
        <PersonalBrainContent />
      </Suspense>
    </WorkspaceShell>
  );
}
