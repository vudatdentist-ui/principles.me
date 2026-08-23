import { cookies } from "next/headers";
import { AskWorkspace } from "@/features/ask/ask-workspace";
import { AuthScreen } from "@/features/auth/auth-screen";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionContext(token) : null;

  if (!session) {
    return <AuthScreen signupAvailable={await signupAvailable()} />;
  }

  return (
    <AskWorkspace
      email={session.user.email}
      workspaceName={session.workspace.name}
    />
  );
}
