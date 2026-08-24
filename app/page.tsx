import { cookies } from "next/headers";
import { Suspense } from "react";
import { signupNeedsBootstrapSecret } from "@/features/auth/bootstrap";
import { AuthScreen } from "@/features/auth/auth-screen";
import { signupMode } from "@/features/auth/contracts";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { projectExecutionState } from "@/features/people/execution-projection";
import { loadExecutionState } from "@/features/people/execution-repository";
import { ExecutionWorkspace } from "@/features/people/execution-workspace";
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

  const [peopleState, executionState] = await Promise.all([
    loadPeopleState(session.workspace.id),
    loadExecutionState(session.workspace.id),
  ]);
  const initialPeopleState = projectPeopleState(peopleState);
  return (
    <>
      <PeopleWorkspace
        email={session.user.email}
        initialState={initialPeopleState}
        workspaceName={session.workspace.name}
      />
      <ExecutionWorkspace
        initialExecutionState={projectExecutionState(executionState)}
        initialPeopleState={initialPeopleState}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceEntry />
    </Suspense>
  );
}
