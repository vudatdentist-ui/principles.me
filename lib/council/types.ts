export type CouncilLayer = "evidence" | "interpretation" | "application";

export type CouncilLensSelection = {
  id: string;
  label: string;
  description: string;
  retrievalHint: string;
  score: number;
};

export type CouncilMember = {
  id: string;
  name: string;
  lens: string;
  reason: string;
};

export type RetrievalContext = {
  kind: "base" | "lens" | "thinker";
  id: string;
  label: string;
};

export type CouncilPlan = {
  mode: "auto" | "manual";
  lenses: CouncilLensSelection[];
  members: CouncilMember[];
  retrievalQueries: Array<
    RetrievalContext & {
      query: string;
    }
  >;
};

export type RetrievedReference = {
  key: string;
  title: string;
  text: string;
  documentId: string | null;
  datasetId: string | null;
  chunkId: string | null;
  score: number | null;
  positions: unknown[];
  retrievalContexts: RetrievalContext[];
};

export type CouncilClaim = {
  text: string;
  layer: CouncilLayer;
  citations: string[];
};

export type FactAssumption = CouncilClaim & {
  status: "fact" | "assumption" | "unknown";
};

export type CouncilBrief = {
  situation: CouncilClaim;
  factsVsAssumptions: FactAssumption[];
  agreement: CouncilClaim[];
  disagreement: CouncilClaim[];
  crux: CouncilClaim[];
  unknowns: CouncilClaim[];
  reversibilityDownside: CouncilClaim[];
  nextMoves: CouncilClaim[];
};

export type CouncilResult = {
  brief: CouncilBrief;
  citations: string[];
  grounded: boolean;
};
