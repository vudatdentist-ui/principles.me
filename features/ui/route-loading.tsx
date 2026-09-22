"use client";

import { T } from "@/features/i18n/locale";
import styles from "./route-state.module.css";

export function RouteLoading() {
  return (
    <p className={styles.loading} role="status">
      <T>Loading your workspace...</T>
    </p>
  );
}
