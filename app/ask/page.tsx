import { DecisionWorkspace } from "@/components/decision-workspace";
import {
  LegacyWorkspaceBoundary,
  WorkspaceShell,
} from "@/components/workspace-shell";

export default function AskPage() {
  return (
    <WorkspaceShell active="ask" title="Ask">
      <LegacyWorkspaceBoundary>
        <DecisionWorkspace initialView="ask" />
      </LegacyWorkspaceBoundary>
    </WorkspaceShell>
  );
}
