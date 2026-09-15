import type { ClientExecutionActionRecord } from "@/features/people/execution-contracts";

export type ExecutionActionStatus = ClientExecutionActionRecord["status"];

export function toggledExecutionActionStatus(
  status: ExecutionActionStatus
): "completed" | "pending" {
  return status === "pending" ? "completed" : "pending";
}
