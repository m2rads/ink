import type { Metadata } from "next";
import { Suspense } from "react";

import { googleEnabled } from "@/lib/auth";

import { SignInScreen } from "./sign-in-screen";

export const metadata: Metadata = {
  title: "Sign in · Ink",
};

// /sign-in?next=<path>: an email code, or Google once it's configured
// (lib/auth.ts). The screen reads `next` and the email link's #fragment in
// the browser, inside Suspense, so the page itself prerenders.
export default function SignInPage() {
  return (
    <Suspense>
      <SignInScreen google={googleEnabled} />
    </Suspense>
  );
}
