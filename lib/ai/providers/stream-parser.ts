import { AiProviderError } from "./provider-error";

export type JsonSseEvent = {
  data: unknown;
  event?: string;
  type: "event";
};

export type JsonSseDone = {
  type: "done";
};

export type JsonSseItem = JsonSseDone | JsonSseEvent;

type JsonSseDecoder = {
  finish: () => JsonSseItem[];
  push: (chunk: string) => JsonSseItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseData(data: string, event?: string): JsonSseItem {
  const trimmed = data.trim();
  if (trimmed === "[DONE]") {
    return { type: "done" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new AiProviderError(
      "AI provider stream contained malformed event data.",
      {
        cause: error,
        code: "invalid_response",
        retryable: false,
      }
    );
  }

  if (event === "error" || (isRecord(parsed) && "error" in parsed)) {
    throw new AiProviderError("AI provider stream reported an error.", {
      code: "provider_error",
      retryable: true,
    });
  }

  return { data: parsed, event, type: "event" };
}

export function createJsonSseDecoder(): JsonSseDecoder {
  let buffer = "";
  let dataLines: string[] = [];
  let eventName: string | undefined;

  const dispatch = (): JsonSseItem[] => {
    if (dataLines.length === 0) {
      eventName = undefined;
      return [];
    }

    const item = parseData(dataLines.join("\n"), eventName);
    dataLines = [];
    eventName = undefined;
    return [item];
  };

  const processLine = (line: string): JsonSseItem[] => {
    if (line === "") {
      return dispatch();
    }

    if (line.startsWith(":")) {
      return [];
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "data") {
      dataLines.push(value);
    } else if (field === "event") {
      eventName = value || undefined;
    }

    return [];
  };

  const readLines = (flush: boolean): JsonSseItem[] => {
    const items: JsonSseItem[] = [];

    while (buffer.length > 0) {
      const newlineIndex = buffer.search(/[\r\n]/);
      if (newlineIndex === -1) {
        break;
      }

      if (
        !flush &&
        buffer[newlineIndex] === "\r" &&
        newlineIndex === buffer.length - 1
      ) {
        break;
      }

      const line = buffer.slice(0, newlineIndex);
      const isCrLf =
        buffer[newlineIndex] === "\r" && buffer[newlineIndex + 1] === "\n";
      buffer = buffer.slice(newlineIndex + (isCrLf ? 2 : 1));
      items.push(...processLine(line));
    }

    if (flush && buffer.length > 0) {
      items.push(...processLine(buffer));
      buffer = "";
    }

    if (flush) {
      items.push(...dispatch());
    }

    return items;
  };

  return {
    finish() {
      return readLines(true);
    },
    push(chunk) {
      buffer += chunk;
      return readLines(false);
    },
  };
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}

export async function* parseJsonSseStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncIterable<JsonSseItem> {
  const decoder = createJsonSseDecoder();
  const textDecoder = new TextDecoder();
  const reader = stream.getReader();

  try {
    while (true) {
      if (signal?.aborted) {
        throw abortReason(signal);
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const text = textDecoder.decode(value, { stream: true });
      for (const item of decoder.push(text)) {
        yield item;
        if (item.type === "done") {
          return;
        }
      }
    }

    const tail = textDecoder.decode();
    for (const item of decoder.push(tail)) {
      yield item;
      if (item.type === "done") {
        return;
      }
    }

    for (const item of decoder.finish()) {
      yield item;
      if (item.type === "done") {
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
