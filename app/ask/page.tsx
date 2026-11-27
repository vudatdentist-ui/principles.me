import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AskWorkspace } from "@/features/ask/ask-workspace";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { AppShell } from "@/features/shell/app-shell";
import { RouteLoading } from "@/features/ui/route-loading";

async function KnowledgeEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");

  return (
    <AppShell
      activeTab="knowledge"
      email={session.user.email}
      workspaceName={session.workspace.name}
    >
      <AskWorkspace />
    </AppShell>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <KnowledgeEntry />
    </Suspense>
  );
}
