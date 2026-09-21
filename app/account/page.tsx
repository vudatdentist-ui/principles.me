import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountControls } from "@/features/account/account-controls";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { AppShell } from "@/features/shell/app-shell";
import { RouteLoading } from "@/features/ui/route-loading";

async function AccountEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");

  return (
    <AppShell email={session.user.email} workspaceName={session.workspace.name}>
      <AccountControls email={session.user.email} />
    </AppShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <AccountEntry />
    </Suspense>
  );
}
