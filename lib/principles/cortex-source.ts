import "server-only";

import { listUserPrinciplesForCortex } from "@/lib/db/principle-queries";

export type CortexUserPrinciple = Awaited<
  ReturnType<typeof listUserPrinciplesForCortex>
>[number];

/**
 * Stable Principles -> Cortex boundary.
 *
 * Cortex owns retrieval/reasoning. Principles only exposes user-owned rules
 * with explicit provenance so they cannot be confused with literature or
 * other external evidence.
 */
export function getUserPrinciplesForCortex(userId: string) {
  return listUserPrinciplesForCortex(userId);
}
