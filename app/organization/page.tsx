import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { OrganizationWorkspace } from "@/features/organization/organization-workspace";
import { loadOrganizationState } from "@/features/organization/repository";

async function OrganizationEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) {
    redirect("/");
  }
  return (
    <OrganizationWorkspace
      email={session.user.email}
      initialState={await loadOrganizationState(session.user.id)}
    />
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationEntry />
    </Suspense>
  );
}
