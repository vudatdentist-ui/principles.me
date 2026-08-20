import "server-only";

import { cookies } from "next/headers";
import {
  createWorkspaceUser,
  getWorkspaceUserById,
} from "@/lib/db/decision-queries";
import {
  readInternalSession,
  WorkspaceAuthenticationError,
} from "@/lib/internal-auth";
import { internalAuthRequired } from "@/lib/session-token";

const WORKSPACE_COOKIE = "principles-workspace";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getWorkspaceUser({ persistCookie = true } = {}) {
  const session = await readInternalSession();
  if (session) {
    const authenticatedUser = await getWorkspaceUserById(session.userId);
    if (
      authenticatedUser &&
      !authenticatedUser.isAnonymous &&
      authenticatedUser.email.toLowerCase() === session.email.toLowerCase()
    ) {
      return authenticatedUser;
    }
  }

  if (internalAuthRequired()) {
    throw new WorkspaceAuthenticationError();
  }

  const cookieStore = await cookies();
  const existingId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (existingId) {
    const existingUser = await getWorkspaceUserById(existingId);
    if (existingUser) {
      return existingUser;
    }
  }

  const createdUser = await createWorkspaceUser();
  if (persistCookie) {
    cookieStore.set(WORKSPACE_COOKIE, createdUser.id, {
      httpOnly: true,
      maxAge: ONE_YEAR,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return createdUser;
}
