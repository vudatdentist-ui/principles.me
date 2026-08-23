import { cookies } from "next/headers";
import { AskWorkspace } from "@/features/ask/ask-workspace";
import { signupNeedsBootstrapSecret } from "@/features/auth/bootstrap";
import { AuthScreen } from "@/features/auth/auth-screen";
import { signupMode } from "@/features/auth/contracts";
import { sessionContext, signupAvailable } from "@/features/auth/repository";
import { SESSION_COOKIE } from "@/features/auth/session";

export default async function HomePage() {
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

  return (
    <AskWorkspace
      email={session.user.email}
      workspaceName={session.workspace.name}
    />
  );
}
