import type { Metadata } from "next";

import { Harness } from "./harness";

// Throwaway prototype route. See harness.tsx.
export const metadata: Metadata = { title: "Dictionary prototype · Ink" };

export default function DictionaryProtoPage() {
  return <Harness />;
}
