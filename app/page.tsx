import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthScreen } from "@/features/auth/auth-screen";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import PracticeStudio from "@/features/practice/practice-studio";
import { AppShell } from "@/features/shell/app-shell";
import { RouteLoading } from "@/features/ui/route-loading";

async function WorkspaceEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;

  if (!session) {
    return <AuthScreen signupAvailable={await signupAvailable()} />;
  }

  return (
    <AppShell
      activeTab="practice"
      email={session.user.email}
      workspaceName={session.workspace.name}
    >
      <PracticeStudio />
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <WorkspaceEntry />
    </Suspense>
  );
}
