import type { Metadata } from "next";
import { Suspense } from "react";

import { AppBarSkeleton } from "@/components/app-bar";

import { PlansScreen } from "./plans-screen";

export const metadata: Metadata = {
  title: "Plans · Encre",
};

// The return from Stripe's checkout carries ?session=, read at request time.
export default function PlansPage() {
  return (
    <Suspense fallback={<AppBarSkeleton />}>
      <PlansScreen />
    </Suspense>
  );
}
