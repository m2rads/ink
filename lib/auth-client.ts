"use client";

import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// The browser's side of lib/auth.ts: the session, and signing in and out.
// Same origin, so no URL to configure.

export const authClient = createAuthClient({ plugins: [emailOTPClient()] });

export const { useSession, signOut } = authClient;

/** Where to sign in, coming back to `next` (a path in Ink) afterwards. */
export function signInHref(next: string) {
  return `/sign-in?${new URLSearchParams({ next })}`;
}

/** The session ended (expired, signed out elsewhere): sign in again, then come back here. */
export function goToSignIn() {
  if (location.pathname !== "/sign-in") location.assign(signInHref(location.pathname + location.search));
}
