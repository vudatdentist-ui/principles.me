export type AiMessageRole = "assistant" | "system" | "user";

export type AiMessage = {
  content: string;
  role: AiMessageRole;
};

export type AiTokenUsage = {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
};

export type AiResponseMetadata = {
  id?: string;
  model?: string;
  usage?: AiTokenUsage;
};

export type AiRequest = {
  maxTokens?: number;
  messages: readonly AiMessage[];
  model?: string;
  onMetadata?: (metadata: AiResponseMetadata) => void;
  signal?: AbortSignal;
  temperature?: number;
  timeoutMs?: number;
};

export type GenerateTextRequest = AiRequest;

export type GenerateObjectRequest<T> = AiRequest & {
  parse: (value: unknown) => T;
};

export type StreamTextRequest = AiRequest;
