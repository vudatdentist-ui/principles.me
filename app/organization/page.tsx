import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { OrganizationRecenter } from "@/features/organization/organization-recenter";
import { loadOrganizationState } from "@/features/organization/repository";
import { AppShell } from "@/features/shell/app-shell";

async function OrganizationEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");

  return (
    <AppShell
      activeTab="organization"
      email={session.user.email}
      workspaceName={session.workspace.name}
    >
      <OrganizationRecenter
        email={session.user.email}
        initialState={await loadOrganizationState(session.user.id)}
      />
    </AppShell>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationEntry />
    </Suspense>
  );
}
