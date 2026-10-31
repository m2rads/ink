import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Ink needs an account (AGENTS.md, Accounts and sync): a visitor without a
// session cookie goes to sign-in, then back to where they were going. The
// landing page at / and the policies are public; a signed-in visitor at /
// goes to Home, since Ink is Home and the essay.
//
// This only looks for the cookie, so it costs no database query; it's what
// sends a signed-out visitor to sign-in, not what keeps data safe. Every
// API route checks the session itself (lib/api/server.ts), and the pages
// hold no one's data until those calls answer: a stale or forged cookie
// gets an empty page whose first call fails and sends it to sign-in.

/** Pages anyone can read: the landing page and the policies its footer links. */
export const PUBLIC_PATHS = new Set(["/", "/terms", "/privacy", "/refunds"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));
  if (pathname === "/" && signedIn) return NextResponse.redirect(new URL("/home", request.url));
  if (PUBLIC_PATHS.has(pathname) || signedIn) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything but sign-in, the API (it answers 401 itself), Next's own files and files with an extension.
  matcher: ["/((?!sign-in|api|_next/static|_next/image|.*\\..*).*)"],
};
