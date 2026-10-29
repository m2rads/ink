"use client";

import { useEffect } from "react";

import { useSession } from "@/lib/auth-client";
import { pauseSync, startSync } from "@/lib/sync/client";

// Keeps this browser in step with the signed-in account (lib/sync/client.ts).
// In the root layout, so it runs on every page; it renders nothing.
export function SyncProvider() {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (userId) void startSync(userId);
    else if (!isPending) pauseSync();
  }, [userId, isPending]);

  return null;
}
