import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  description: "A minimal decision workspace backed by a typed evidence system.",
  title: "Principles v2",
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/v2">
          Principles
        </Link>
        <nav aria-label="V2 navigation" className={styles.navigation}>
          <Link href="/v2/history">History</Link>
          <Link href="/v2/brain">Brain</Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
