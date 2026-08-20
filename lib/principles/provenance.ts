export type PrincipleOriginKind =
  | "decision"
  | "journal"
  | "problem"
  | "manual"
  | "team";

export type PrincipleOrigin = {
  href?: string;
  kind: PrincipleOriginKind;
  label: string;
  relation?: "created" | "adopted" | "applied" | "challenged";
  sourceId?: string;
};

export type PrincipleProvenanceProvider = {
  kind: Exclude<PrincipleOriginKind, "decision" | "manual">;
  listOrigins: (args: {
    principleIds: string[];
    userId: string;
  }) => Promise<Map<string, PrincipleOrigin[]>>;
};

/**
 * Journal/Goals integrations should provide typed provenance from their own
 * link tables once those schemas exist. This avoids an unverified
 * sourceType/sourceId polymorphic foreign key in the Principles schema.
 */
export async function collectExtendedPrincipleOrigins({
  principleIds,
  providers,
  userId,
}: {
  principleIds: string[];
  providers: PrincipleProvenanceProvider[];
  userId: string;
}) {
  const collected = new Map<string, PrincipleOrigin[]>();
  const providerResults = await Promise.all(
    providers.map((provider) => provider.listOrigins({ principleIds, userId }))
  );

  for (const providerOrigins of providerResults) {
    for (const [principleId, origins] of providerOrigins) {
      collected.set(principleId, [
        ...(collected.get(principleId) ?? []),
        ...origins,
      ]);
    }
  }

  return collected;
}
