import {
  buildNoEvidenceResult,
  sanitizeClarificationQuestions,
  sanitizeCortexResult,
} from "./grounding";
import type {
  CortexAnswers,
  CortexExternalEvidenceProvider,
  CortexMemoryProvider,
  CortexReasoner,
  CortexResponse,
  CortexRunInput,
  CortexRunRecord,
  CortexRunStore,
} from "./types";

export class CortexRunNotFoundError extends Error {
  constructor() {
    super("Cortex run was not found for this user.");
    this.name = "CortexRunNotFoundError";
  }
}

export class CortexRunStateError extends Error {
  constructor() {
    super("Cortex run is not awaiting clarification.");
    this.name = "CortexRunStateError";
  }
}

type CortexDependencies = {
  memory: CortexMemoryProvider;
  external: CortexExternalEvidenceProvider;
  reasoner: CortexReasoner;
  store: CortexRunStore;
  makeRunId?: () => string;
};

export class CortexService {
  private readonly makeRunId: () => string;

  constructor(private readonly dependencies: CortexDependencies) {
    this.makeRunId = dependencies.makeRunId ?? (() => crypto.randomUUID());
  }

  async run(input: CortexRunInput, userId: string): Promise<CortexResponse> {
    return this.execute({
      answers: {},
      allowClarification: true,
      input,
      runId: this.makeRunId(),
      userId,
      writeMode: "create",
    });
  }

  async continue(
    runId: string,
    answers: CortexAnswers,
    userId: string
  ): Promise<CortexResponse> {
    const existing = await this.dependencies.store.get({ runId, userId });
    if (!existing) {
      throw new CortexRunNotFoundError();
    }
    if (existing.status !== "clarify") {
      throw new CortexRunStateError();
    }
    return this.execute({
      answers: { ...existing.answers, ...answers },
      allowClarification: false,
      input: existing.input,
      runId,
      userId,
      writeMode: "update",
    });
  }

  private async execute({
    answers,
    allowClarification,
    input,
    runId,
    userId,
    writeMode,
  }: {
    answers: CortexAnswers;
    allowClarification: boolean;
    input: CortexRunInput;
    runId: string;
    userId: string;
    writeMode: "create" | "update";
  }): Promise<CortexResponse> {
    const [memory, external] = await Promise.all([
      this.dependencies.memory.retrieve({ answers, input, userId }),
      this.dependencies.external.retrieve({ answers, input }),
    ]);
    const evidence = [...external.evidence, ...memory.evidence];

    if (external.evidence.length === 0) {
      const response: CortexResponse = {
        runId,
        status: "complete",
        result: buildNoEvidenceResult({
          evidence,
          input,
          reason: external.reason,
        }),
      };
      await this.persist({ answers, input, response, userId, writeMode });
      return response;
    }

    const decision = await this.dependencies.reasoner.reason({
      allowClarification,
      answers,
      external,
      input,
      memory,
    });

    if (decision.status === "clarify" && allowClarification) {
      const questions = sanitizeClarificationQuestions(
        decision.clarification.questions
      ).slice(0, 3);
      if (questions.length > 0) {
        const response: CortexResponse = {
          clarification: { questions },
          runId,
          status: "clarify",
        };
        await this.persist({ answers, input, response, userId, writeMode });
        return response;
      }
    }

    const result =
      decision.status === "complete"
        ? sanitizeCortexResult({ draft: decision.result, evidence, input })
        : buildNoEvidenceResult({
            evidence,
            input,
            reason: "CLARIFICATION_LIMIT_REACHED",
          });
    const response: CortexResponse = { result, runId, status: "complete" };
    await this.persist({ answers, input, response, userId, writeMode });
    return response;
  }

  private persist({
    answers,
    input,
    response,
    userId,
    writeMode,
  }: {
    answers: CortexAnswers;
    input: CortexRunInput;
    response: CortexResponse;
    userId: string;
    writeMode: "create" | "update";
  }) {
    const record: CortexRunRecord = {
      answers,
      clarification:
        response.status === "clarify" ? response.clarification : null,
      id: response.runId,
      input,
      result: response.status === "complete" ? response.result : null,
      status: response.status,
      userId,
    };
    return writeMode === "create"
      ? this.dependencies.store.create(record)
      : this.dependencies.store.update(record);
  }
}
