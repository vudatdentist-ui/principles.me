import type {
  GenerateObjectRequest,
  GenerateTextRequest,
  StreamTextRequest,
} from "./types";

export interface AiProvider {
  readonly id: string;

  generateObject<T>(request: GenerateObjectRequest<T>): Promise<T>;
  generateText(request: GenerateTextRequest): Promise<string>;
  streamText(request: StreamTextRequest): AsyncIterable<string>;
}
