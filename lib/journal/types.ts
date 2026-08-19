export type JournalCandidateStatus = "pending" | "adopted" | "rejected";

export type JournalCandidate = {
  id: string;
  rationale: string | null;
  statement: string;
  status: JournalCandidateStatus;
};

export type JournalCortexContext = {
  entryId: string;
  experience: string;
  reflection: string | null;
};

export type JournalCortexSuggestion = {
  candidate?: {
    rationale?: string;
    statement: string;
  };
  observation?: string;
  question?: string;
};

export interface JournalCortexAdapter {
  reflect(context: JournalCortexContext): Promise<JournalCortexSuggestion>;
}
