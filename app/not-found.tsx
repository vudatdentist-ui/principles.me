import styles from "@/features/ui/route-state.module.css";

export default function NotFound() {
  return (
    <main className={styles.state}>
      <h1>This page does not exist.</h1>
      <p>Check the address, or return to your workspace.</p>
      <a href="/">Return to Me</a>
    </main>
  );
}
