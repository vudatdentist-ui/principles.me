import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { AppShell, type AppTab } from "@/features/shell/app-shell";
import { practiceState } from "@/features/team-practice/repository";
import { Practice } from "@/features/team-practice/practice";
import { RouteLoading } from "@/features/ui/route-loading";

async function Entry() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");
  return <AppShell activeTab={"team-practice" as AppTab} email={session.user.email} workspaceName={session.workspace.name}>
    <Practice {...await practiceState(session.user.id)} />
  </AppShell>;
}

export default function TeamPracticePage() {
  return <Suspense fallback={<RouteLoading />}><Entry /></Suspense>;
}
