"use client";

import type { ClientExecutionActionRecord } from "@/features/people/execution-contracts";
import styles from "./evolution-workspace.module.css";

type ActionStatus = ClientExecutionActionRecord["status"];

export function ExecutionActionList({
  actions,
  disabled,
  onStatusChange,
}: {
  actions: ClientExecutionActionRecord[];
  disabled: boolean;
  onStatusChange: (actionId: string, status: ActionStatus) => void;
}) {
  return (
    <div className={styles.actionList}>
      {actions.map((action) => {
        const completed = action.status === "completed";
        const cancelled = action.status === "cancelled";
        return (
          <div className={styles.actionRow} key={action.id}>
            <button
              aria-label={
                completed
                  ? `Reopen ${action.commitment}`
                  : cancelled
                    ? `Restore ${action.commitment}`
                    : `Complete ${action.commitment}`
              }
              className={
                completed
                  ? styles.actionDone
                  : cancelled
                    ? styles.actionCancelled
                    : styles.actionToggle
              }
              disabled={disabled}
              onClick={() => onStatusChange(action.id, completed || cancelled ? "pending" : "completed")}
              type="button"
            >
              {completed ? "✓" : cancelled ? "↺" : action.position + 1}
            </button>
            <span className={completed ? styles.completedText : cancelled ? styles.cancelledText : undefined}>
              {action.commitment}
            </span>
            {action.status === "pending" ? (
              <button
                className={styles.tertiary}
                disabled={disabled}
                onClick={() => onStatusChange(action.id, "cancelled")}
                type="button"
              >
                Cancel
              </button>
            ) : cancelled ? (
              <button
                className={styles.tertiary}
                disabled={disabled}
                onClick={() => onStatusChange(action.id, "pending")}
                type="button"
              >
                Restore
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
