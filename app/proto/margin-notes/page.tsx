import type { Metadata } from "next";

import { Harness } from "./harness";

// Throwaway prototype route. See harness.tsx.
export const metadata: Metadata = { title: "Margin notes prototype · Ink" };

export default function MarginNotesProtoPage() {
  return <Harness />;
}
