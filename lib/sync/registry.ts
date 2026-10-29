import type { Kind } from "./kinds";

// How the local stores tell sync something changed, without importing it
// (sync imports the stores, lib/sync/adapters.ts). The stores call
// `changed` from their onChange; the sync client listens.

let listener: ((kind: Kind, id: string) => void) | null = null;

export function changed(kind: Kind, id: string) {
  listener?.(kind, id);
}

export function listen(next: (kind: Kind, id: string) => void) {
  listener = next;
}
