import { NextResponse } from "next/server";
import { readInternalSession } from "@/lib/internal-auth";

export async function GET() {
  const session = await readInternalSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}
