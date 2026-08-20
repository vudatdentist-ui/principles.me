import "server-only";

import { cortexRunStore } from "@/lib/db/cortex-run-queries";
import {
  cortexExternalEvidenceProvider,
  cortexPersonalMemoryProvider,
} from "./providers";
import { deepSeekCortexReasoner } from "./reasoner";
import { CortexService } from "./service";

export const Cortex = new CortexService({
  external: cortexExternalEvidenceProvider,
  memory: cortexPersonalMemoryProvider,
  reasoner: deepSeekCortexReasoner,
  store: cortexRunStore,
});

export type {
  CortexAnswers,
  CortexClarification,
  CortexClarifyResponse,
  CortexCompleteResponse,
  CortexResponse,
  CortexResult,
  CortexRunInput,
} from "./types";
