"use client";

import { T } from "@/features/i18n/locale";
import styles from "@/features/ui/route-state.module.css";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.state}>
      <h1><T>This workspace could not load.</T></h1>
      <p role="alert">
        <T>Try again to load your saved records.</T>
      </p>
      <button className={styles.action} onClick={reset} type="button">
        <T>Try again</T>
      </button>
      <a href="/"><T>Return to Me</T></a>
    </main>
  );
}
