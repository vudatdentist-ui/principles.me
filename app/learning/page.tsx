import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { LearningWorkspace } from "@/features/learning/learning-workspace";
import { projectLearningState } from "@/features/learning/projection";
import { loadLearningState } from "@/features/learning/repository";

async function LearningEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) {
    redirect("/");
  }
  const initialState = projectLearningState(
    await loadLearningState(session.workspace.id)
  );
  return (
    <LearningWorkspace
      email={session.user.email}
      initialState={initialState}
      workspaceName={session.workspace.name}
    />
  );
}

export default function LearningPage() {
  return (
    <Suspense fallback={null}>
      <LearningEntry />
    </Suspense>
  );
}
