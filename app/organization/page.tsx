import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { OrganizationWorkspace } from "@/features/organization/organization-workspace";
import { loadOrganizationState } from "@/features/organization/repository";
import styles from "./organization-entry.module.css";

async function OrganizationEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) {
    redirect("/");
  }
  const state = await loadOrganizationState(session.user.id);
  return (
    <>
      <OrganizationWorkspace email={session.user.email} initialState={state} />
      {state.organizations.length > 0 ? (
        <div className={styles.launch}>
          <a href="/organization/evolve">Evolve</a>
        </div>
      ) : null}
    </>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationEntry />
    </Suspense>
  );
}
