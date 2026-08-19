import { FeaturePlaceholder } from "@/components/personal-os-surfaces";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function GoalsPage() {
  return (
    <WorkspaceShell active="goals" title="Goals">
      <FeaturePlaceholder actionHref="/" actionLabel="Today" label="Goals" />
    </WorkspaceShell>
  );
}
