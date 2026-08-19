import { NextResponse } from "next/server";
import { clearInternalSession } from "@/lib/internal-auth";

export async function POST() {
  await clearInternalSession();
  return NextResponse.json({ ok: true });
}
