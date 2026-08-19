import { AskThinkingSession } from "@/components/ask-thinking-session";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function AskPage() {
  return (
    <WorkspaceShell active="ask" title="Ask">
      <AskThinkingSession />
    </WorkspaceShell>
  );
}
