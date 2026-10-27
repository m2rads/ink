import type { Metadata } from "next";

import { Harness } from "./harness";

// Throwaway prototype route. See harness.tsx.
export const metadata: Metadata = { title: "Conjugation prototype · Ink" };

export default function ConjugationProtoPage() {
  return <Harness />;
}
