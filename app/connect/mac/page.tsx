import type { Metadata } from "next";
import { Suspense } from "react";

import { ConnectMacScreen, ConnectSkeleton } from "./connect-mac-screen";

export const metadata: Metadata = {
  title: "Connect · Ink",
};

// /connect/mac?state=…&challenge=…: Encre for Mac signing in through the web
// (lib/connect.ts). The app's state and challenge are request-time data, so
// they're read inside Suspense and the skeleton prerenders.
export default function ConnectMacPage() {
  return (
    <Suspense fallback={<ConnectSkeleton />}>
      <ConnectMacScreen />
    </Suspense>
  );
}
