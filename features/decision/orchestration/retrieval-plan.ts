import type { EvidenceProvider } from "../../evidence/providers/evidence-provider";
import type { RetrievalPlan } from "./types";

export function createRetrievalPlan(
  providers: readonly EvidenceProvider[]
): RetrievalPlan {
  const ids = new Set<string>();
  const plannedProviders = providers.map((provider, order) => {
    if (ids.has(provider.id)) {
      throw new Error(`Duplicate evidence provider id: ${provider.id}`);
    }
    ids.add(provider.id);
    return { id: provider.id, order };
  });

  return {
    providers: plannedProviders,
    strategy: "all",
  };
}
