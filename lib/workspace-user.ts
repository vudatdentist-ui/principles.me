import "server-only";

import { cookies } from "next/headers";
import {
  createWorkspaceUser,
  getWorkspaceUserById,
} from "@/lib/db/decision-queries";

const WORKSPACE_COOKIE = "principles-workspace";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getWorkspaceUser() {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (existingId) {
    const existingUser = await getWorkspaceUserById(existingId);
    if (existingUser) {
      return existingUser;
    }
  }

  const createdUser = await createWorkspaceUser();
  cookieStore.set(WORKSPACE_COOKIE, createdUser.id, {
    httpOnly: true,
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return createdUser;
}
