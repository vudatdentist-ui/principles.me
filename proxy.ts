import { type NextRequest, NextResponse } from "next/server";

const captureMarker = "$" + "{1}";
const LEGACY_PLACEHOLDER_PATHS = new Set(["/$%7B1%7D", `/${captureMarker}`]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Keep malformed paths untouched; only the known legacy placeholder is
    // eligible for recovery.
  }

  if (
    LEGACY_PLACEHOLDER_PATHS.has(pathname) ||
    decodedPathname === `/${captureMarker}`
  ) {
    const recoveryUrl = request.nextUrl.clone();
    recoveryUrl.hostname = "principles.me";
    recoveryUrl.pathname = "/";
    return NextResponse.redirect(recoveryUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
