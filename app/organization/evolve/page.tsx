import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { OrganizationEvolution } from "@/features/organization/organization-evolution";
import { loadOrganizationState } from "@/features/organization/repository";

async function OrganizationEvolutionEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) {
    redirect("/");
  }
  return (
    <OrganizationEvolution
      email={session.user.email}
      organizations={await loadOrganizationState(session.user.id)}
    />
  );
}

export default function OrganizationEvolutionPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationEvolutionEntry />
    </Suspense>
  );
}
