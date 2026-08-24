import type { EvidencePacket } from "../contracts";

export interface EvidenceQuery {
  readonly datasetIds?: readonly string[];
  readonly question: string;
}

export type EvidenceProviderResult = EvidencePacket;

export interface EvidenceProvider {
  readonly id: string;

  retrieve: (
    request: EvidenceQuery,
    signal: AbortSignal
  ) => Promise<EvidenceProviderResult>;
}

export interface EvidenceProviderDependencies {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
}

export function runtimeEnvironment(): Readonly<
  Record<string, string | undefined>
> {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env ?? {};
}
