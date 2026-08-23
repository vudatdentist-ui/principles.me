import type { EvidenceProvider } from "./evidence-provider";
import { EvidenceProviderError } from "./provider-error";

export type BestEffortEvidenceProviderOptions = {
  now?: () => Date;
};

export function createBestEffortEvidenceProvider(
  provider: EvidenceProvider,
  options: BestEffortEvidenceProviderOptions = {}
): EvidenceProvider {
  const now = options.now ?? (() => new Date());

  return {
    id: provider.id,
    async retrieve(request, signal) {
      try {
        return await provider.retrieve(request, signal);
      } catch (error) {
        if (
          signal.aborted ||
          (error instanceof EvidenceProviderError && error.code === "aborted")
        ) {
          throw error;
        }

        return {
          references: [],
          retrievedAt: now().toISOString(),
        };
      }
    },
  };
}
