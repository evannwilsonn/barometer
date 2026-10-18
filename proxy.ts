import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// The logbook needs a signed-in reader. This only checks that a session cookie exists, so it
// can redirect early; the page and every action still verify the session itself.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const to = new URL("/sign-in", request.url);
    to.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/logbook/:path*"] };
