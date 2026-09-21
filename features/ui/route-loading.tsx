import styles from "./route-state.module.css";

export function RouteLoading() {
  return (
    <p className={styles.loading} role="status">
      Loading your workspace...
    </p>
  );
}
