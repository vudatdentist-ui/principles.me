import { cookies } from "next/headers";
import { Suspense } from "react";
import { signupNeedsBootstrapSecret } from "@/features/auth/bootstrap";
import { AuthScreen } from "@/features/auth/auth-screen";
import { signupMode } from "@/features/auth/contracts";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { PeopleWorkspace } from "@/features/people/people-workspace";
import { projectPeopleState } from "@/features/people/projection";
import { loadPeopleState } from "@/features/people/repository";

async function WorkspaceEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;

  if (!session) {
    const mode = signupMode(process.env.AUTH_SIGNUP_MODE);
    return (
      <AuthScreen
        signupAvailable={await signupAvailable()}
        signupRequiresSetupKey={signupNeedsBootstrapSecret(mode)}
      />
    );
  }

  const initialState = projectPeopleState(
    await loadPeopleState(session.workspace.id)
  );
  return (
    <PeopleWorkspace
      email={session.user.email}
      initialState={initialState}
      workspaceName={session.workspace.name}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceEntry />
    </Suspense>
  );
}
