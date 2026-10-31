"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";
import { claimLocalData } from "@/lib/sync/client";

// Signing in (lib/auth.ts), which is also signing up: the first sign-in
// with an email or Google account creates it. One email with a code and a
// link, or Google.
//
// - Email: the writer types their email, gets a code, types it here.
// - The email's link opens /sign-in#email=…&code=…: the code is already
//   there, but nothing happens until "Sign in" is pressed, so a mail scanner
//   opening the link can't use it up.
//
// Signed in, essays already in this browser (written before accounts) go to
// the account (claimLocalData), then the writer goes on to `next`.

type Step = { kind: "email" } | { kind: "code"; email: string } | { kind: "link"; email: string; code: string };

export function SignInScreen({ google }: { google: boolean }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: session } = useSession();
  const fromLink = useLinkFragment();
  // Until the writer does something, the step is the email's link's, if they came from it.
  const [chosen, setStep] = useState<Step | null>(null);
  const step = chosen ?? fromLink ?? { kind: "email" };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on leaving, so the forms (and what was typed in them) start fresh.
  const [visit, setVisit] = useState(0);

  // Signing in or out hides this route rather than unmounting it. Coming
  // back (after signing out, say) must not show the last email or code.
  useLayoutEffect(
    () => () => {
      setStep(null);
      setError(null);
      setBusy(false);
      setVisit((v) => v + 1);
    },
    [],
  );

  // The code shouldn't stay in the address bar or the history.
  useEffect(() => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }, []);

  // Already signed in (or just now): on to where the writer was going.
  useEffect(() => {
    if (!session) return;
    // The link has done its job; signing out and back here shouldn't offer it again.
    forgetFragment();
    let gone = false;
    void claimLocalData().finally(() => {
      if (!gone) router.replace(next);
    });
    return () => {
      gone = true;
    };
  }, [session, next, router]);

  async function sendCode(email: string) {
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Too many codes sent. Wait a minute and try again" : "Couldn’t send the code. Try again");
      return;
    }
    setStep({ kind: "code", email });
  }

  async function signIn(email: string, otp: string) {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      setBusy(false);
      setError(
        error.status === 429
          ? "Too many tries. Wait a minute and try again"
          : error.code === "TOO_MANY_ATTEMPTS"
            ? "Too many wrong codes. Send a new one"
            : "That code doesn’t match, or it expired. Send a new one",
      );
      return;
    }
    // The session effect above takes it from here.
  }

  async function withGoogle() {
    setBusy(true);
    await authClient.signIn.social({ provider: "google", callbackURL: `/sign-in?${new URLSearchParams({ next })}` });
  }

  return (
    <main key={visit} className="mx-auto grid w-full max-w-sm gap-6 px-4 pt-24 pb-16">
      {step.kind === "email" && (
        <>
          <h1 className="text-heading">Sign in or sign up</h1>
          {google && (
            <>
              <Button variant="outline" onClick={withGoogle} disabled={busy}>
                Continue with Google
              </Button>
              <p className="text-center text-label text-text-3">or</p>
            </>
          )}
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
              if (email) void sendCode(email);
            }}
          >
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-label text-text-2">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                aria-invalid={!!error}
                aria-describedby={error ? "sign-in-error" : undefined}
              />
            </div>
            <Problem message={error} />
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Email me a code"}
            </Button>
          </form>
        </>
      )}

      {step.kind === "code" && (
        <>
          <div className="grid gap-1">
            <h1 className="text-heading">Check your email</h1>
            <p className="text-ui text-text-2">
              Code sent to <span className="text-text">{step.email}</span>
            </p>
          </div>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\D/g, "");
              if (code.length === 6) void signIn(step.email, code);
            }}
          >
            <div className="grid gap-1.5">
              <label htmlFor="code" className="text-label text-text-2">
                Code
              </label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                aria-invalid={!!error}
                aria-describedby={error ? "sign-in-error" : undefined}
                className="tabular-nums"
                onChange={(e) => {
                  const code = e.currentTarget.value.replace(/\D/g, "");
                  if (code.length === 6 && !busy) void signIn(step.email, code);
                }}
              />
            </div>
            <Problem message={error} />
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Button variant="link" onClick={() => void sendCode(step.email)} disabled={busy}>
              Send a new code
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setError(null);
                setStep({ kind: "email" });
              }}
            >
              Use another email
            </Button>
          </div>
        </>
      )}

      {step.kind === "link" && (
        <>
          <div className="grid gap-1">
            <h1 className="text-heading">Sign in to Encre</h1>
            <p className="text-ui text-text-2">
              As <span className="text-text">{step.email}</span>
            </p>
          </div>
          <Problem message={error} />
          <Button onClick={() => void signIn(step.email, step.code)} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {error && (
            <Button
              variant="link"
              className="justify-self-start"
              onClick={() => {
                setError(null);
                setStep({ kind: "email" });
              }}
            >
              Send a new code
            </Button>
          )}
        </>
      )}
    </main>
  );
}

// The email's link carries the email and code in its #fragment, which never
// reaches a server. Read once: the page clears it from the address bar, and
// forgets it once signed in.
let fragment: string | null = null;
const readFragment = () => (fragment ??= location.hash);
const forgetFragment = () => {
  fragment = "";
};
const noSubscribe = () => () => {};

function useLinkFragment(): Step | null {
  const hash = useSyncExternalStore(noSubscribe, readFragment, () => "");
  const params = new URLSearchParams(hash.slice(1));
  const email = params.get("email");
  const code = params.get("code");
  return email && code ? { kind: "link", email, code } : null;
}

function Problem({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p id="sign-in-error" role="alert" className="flex items-center gap-1.5 text-label text-warn">
      <CircleAlertIcon className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

/** Only a path in Ink: never another site ("//evil.com", "https://…"). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/home";
}
