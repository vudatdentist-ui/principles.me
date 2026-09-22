"use client";

import { T } from "@/features/i18n/locale";
import styles from "@/features/ui/route-state.module.css";

export default function NotFound() {
  return (
    <main className={styles.state}>
      <h1><T>This page does not exist.</T></h1>
      <p><T>Check the address, or return to your workspace.</T></p>
      <a href="/"><T>Return to Me</T></a>
    </main>
  );
}
