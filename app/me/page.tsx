import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { EvolutionWorkspace } from "@/features/evolution/evolution-workspace";
import { loadEvolutionState } from "@/features/evolution/service";
import { AppShell } from "@/features/shell/app-shell";
import { RouteLoading } from "@/features/ui/route-loading";

async function PersonalHistory() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");
  return (
    <AppShell activeTab="people" email={session.user.email} workspaceName={session.workspace.name}>
      <EvolutionWorkspace initialState={await loadEvolutionState(session.workspace.id)} />
    </AppShell>
  );
}

export default function MePage() {
  return <Suspense fallback={<RouteLoading />}><PersonalHistory /></Suspense>;
}
