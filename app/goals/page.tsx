import { GoalsWorkspace } from "@/components/goals/goals-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function GoalsPage() {
  return (
    <WorkspaceShell active="goals" title="Goals">
      <GoalsWorkspace />
    </WorkspaceShell>
  );
}
