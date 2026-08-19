import { FeaturePlaceholder } from "@/components/personal-os-surfaces";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function JournalPage() {
  return (
    <WorkspaceShell active="journal" title="Journal">
      <FeaturePlaceholder
        actionHref="/"
        actionLabel="Today"
        label="Journal"
      />
    </WorkspaceShell>
  );
}
