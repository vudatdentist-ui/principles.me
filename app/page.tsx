import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthScreen } from "@/features/auth/auth-screen";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { EvolutionWorkspace } from "@/features/evolution/evolution-workspace";
import { loadEvolutionState } from "@/features/evolution/service";
import { AppShell } from "@/features/shell/app-shell";

async function WorkspaceEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;

  if (!session) {
    return <AuthScreen signupAvailable={await signupAvailable()} />;
  }

  return (
    <AppShell
      activeTab="people"
      email={session.user.email}
      workspaceName={session.workspace.name}
    >
      <EvolutionWorkspace initialState={await loadEvolutionState(session.workspace.id)} />
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceEntry />
    </Suspense>
  );
}
