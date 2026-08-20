import { TodaySurface } from "@/components/personal-os-surfaces";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function HomePage() {
  return (
    <WorkspaceShell active="today" title="Today">
      <TodaySurface />
    </WorkspaceShell>
  );
}
