"use client";

import { T, useI18n } from "@/features/i18n/locale";
import type { ClientExecutionActionRecord } from "@/features/people/execution-contracts";
import {
  toggledExecutionActionStatus,
  type ExecutionActionStatus,
} from "./execution-action-state";
import styles from "./evolution-workspace.module.css";

export function ExecutionActionList({
  actions,
  disabled,
  onStatusChange,
}: {
  actions: ClientExecutionActionRecord[];
  disabled: boolean;
  onStatusChange: (actionId: string, status: ExecutionActionStatus) => void;
}) {
  const { t } = useI18n();

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
                  ? t("Reopen {action}", { action: action.commitment })
                  : cancelled
                    ? t("Restore {action}", { action: action.commitment })
                    : t("Complete {action}", { action: action.commitment })
              }
              className={
                completed
                  ? styles.actionDone
                  : cancelled
                    ? styles.actionCancelled
                    : styles.actionToggle
              }
              disabled={disabled}
              onClick={() =>
                onStatusChange(
                  action.id,
                  toggledExecutionActionStatus(action.status),
                )
              }
              type="button"
            >
              {completed ? "✓" : cancelled ? "↺" : action.position + 1}
            </button>
            <span
              className={
                completed
                  ? styles.completedText
                  : cancelled
                    ? styles.cancelledText
                    : undefined
              }
            >
              {action.commitment}
            </span>
            {action.status === "pending" ? (
              <button
                className={styles.tertiary}
                disabled={disabled}
                onClick={() => onStatusChange(action.id, "cancelled")}
                type="button"
              >
                <T>Cancel</T>
              </button>
            ) : cancelled ? (
              <button
                className={styles.tertiary}
                disabled={disabled}
                onClick={() => onStatusChange(action.id, "pending")}
                type="button"
              >
                <T>Restore</T>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
