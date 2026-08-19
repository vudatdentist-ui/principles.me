import { DecisionWorkspace } from "@/components/decision-workspace";
import {
  LegacyWorkspaceBoundary,
  WorkspaceShell,
} from "@/components/workspace-shell";

export default function DecisionsPage() {
  return (
    <WorkspaceShell active="decisions" title="Decisions">
      <LegacyWorkspaceBoundary>
        <DecisionWorkspace initialView="decisions" />
      </LegacyWorkspaceBoundary>
    </WorkspaceShell>
  );
}
