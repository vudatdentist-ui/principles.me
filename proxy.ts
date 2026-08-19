import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  internalAuthRequired,
  isInternalEmailAllowed,
  verifyInternalSession,
} from "@/lib/session-token";

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Internal authentication required." },
      { status: 401 }
    );
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  if (!internalAuthRequired()) {
    return NextResponse.next();
  }
  const session = await verifyInternalSession(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET?.trim()
  );
  if (!session || !isInternalEmailAllowed(session.email)) {
    return unauthorized(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/decisions/:path*",
    "/principles/:path*",
    "/brain/:path*",
    "/api/decisions/:path*",
    "/api/principles/:path*",
    "/api/council",
  ],
};
