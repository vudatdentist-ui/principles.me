"use client";

import styles from "@/features/ui/route-state.module.css";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.state}>
      <h1>This workspace could not load.</h1>
      <p role="alert">
        Try again to load your saved records.
      </p>
      <button className={styles.action} onClick={reset} type="button">
        Try again
      </button>
      <a href="/">Return to Me</a>
    </main>
  );
}
