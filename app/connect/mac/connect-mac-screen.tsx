"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, connectMac } from "@/lib/api/client";
import { connectMacInput } from "@/lib/api/schemas";
import { goToSignIn, signInHref, useSession } from "@/lib/auth-client";
import { signOutAndClear } from "@/lib/sync/client";

// Connecting Encre for Mac (lib/connect.ts). The app opens this page with its
// state and PKCE challenge; signed-out writers sign in first and come back
// (proxy.ts keeps the query in `next`). "Connect" asks for a one-time code
// and hands it to the app's callback with the state; the app trades it for
// its own session.

type Step = "confirm" | "done";

export function ConnectMacScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const request = connectMacInput.safeParse({ state: params.get("state"), challenge: params.get("challenge") });
  const { data: session, isPending, error: sessionError, refetch } = useSession();
  const [step, setStep] = useState<Step>("confirm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving hides this route rather than unmounting it: coming back (another
  // account, a new link from the app) starts over.
  useLayoutEffect(
    () => () => {
      setStep("confirm");
      setBusy(false);
      setError(null);
    },
    [],
  );

  // The server says there's no session (a cookie it no longer knows): sign in
  // again, then back here. Not when the request only failed (offline, rate
  // limited): sign-in would find the session and send the writer straight
  // back, around and around. (Switching accounts goes there itself.)
  const signedOut = !isPending && !session && (!sessionError || sessionError.status === 401);
  useEffect(() => {
    if (signedOut && !busy) goToSignIn();
  }, [signedOut, busy]);

  if (!request.success) {
    return (
      <main className="mx-auto grid w-full max-w-sm gap-1 px-4 pt-24 pb-16">
        <h1 className="text-heading">This link isn’t valid</h1>
        <p className="text-ui text-text-2">Try again from Encre</p>
      </main>
    );
  }
  if (!session && !isPending && !signedOut) {
    return (
      <main className="mx-auto grid w-full max-w-sm gap-6 px-4 pt-24 pb-16">
        <div className="grid gap-1">
          <h1 className="text-heading">Connect Encre for Mac</h1>
          <p role="alert" className="flex items-center gap-1.5 text-label text-warn">
            <CircleAlertIcon className="size-3.5 shrink-0" />
            Couldn’t load your account
          </p>
        </div>
        <Button onClick={() => void refetch()}>Try again</Button>
      </main>
    );
  }
  if (!session) return <ConnectSkeleton />;
  const { state, challenge } = request.data;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const code = await connectMac({ state, challenge });
      setStep("done");
      leaveFor(`encre://connect?${new URLSearchParams({ code, state })}`);
    } catch (error) {
      setError(error instanceof ApiError && error.code === "rate" ? "Too many tries. Wait a minute and try again" : "Couldn’t connect. Try again");
    }
    setBusy(false);
  }

  async function switchAccount() {
    setBusy(true);
    setError(null);
    try {
      await signOutAndClear();
      router.replace(signInHref(location.pathname + location.search));
    } catch {
      setBusy(false);
      setError("Some changes aren’t saved to your account yet. Try again online");
    }
  }

  if (step === "done") {
    return (
      <main className="mx-auto grid w-full max-w-sm gap-1 px-4 pt-24 pb-16">
        <h1 className="text-heading">Back to Encre</h1>
        <p className="text-ui text-text-2">You can close this tab</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-sm gap-6 px-4 pt-24 pb-16">
      <div className="grid gap-1">
        <h1 className="text-heading">Connect Encre for Mac</h1>
        <p className="text-ui text-text-2">
          Signed in as <span className="text-text">{session.user.email}</span>
        </p>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-label text-warn">
          <CircleAlertIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
      <Button onClick={() => void connect()} disabled={busy}>
        {busy ? "Connecting…" : "Connect"}
      </Button>
      <Button variant="link" className="justify-self-start" onClick={() => void switchAccount()} disabled={busy}>
        Use another account
      </Button>
    </main>
  );
}

/** While the page and the session load. */
export function ConnectSkeleton() {
  return (
    <main className="mx-auto grid w-full max-w-sm gap-6 px-4 pt-24 pb-16" aria-busy>
      <div className="grid gap-2" aria-hidden>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-9 w-full" aria-hidden />
    </main>
  );
}

/** The app's callback is another scheme: a full page load, not a route change. */
function leaveFor(url: string) {
  location.assign(url);
}
