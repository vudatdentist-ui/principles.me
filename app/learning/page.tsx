import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionContext } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";
import { loadEvolutionState } from "@/features/evolution/service";
import { LearningRecenter } from "@/features/learning/learning-recenter";
import { projectLearningState } from "@/features/learning/projection";
import { loadLearningState } from "@/features/learning/repository";
import { AppShell } from "@/features/shell/app-shell";

async function LearningEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;
  if (!session) redirect("/");

  const [learning, evolution] = await Promise.all([
    loadLearningState(session.workspace.id).then(projectLearningState),
    loadEvolutionState(session.workspace.id),
  ]);

  return (
    <AppShell
      activeTab="learning"
      email={session.user.email}
      workspaceName={session.workspace.name}
    >
      <LearningRecenter
        email={session.user.email}
        evolution={evolution}
        initialState={learning}
        workspaceName={session.workspace.name}
      />
    </AppShell>
  );
}

export default function LearningPage() {
  return (
    <Suspense fallback={null}>
      <LearningEntry />
    </Suspense>
  );
}
