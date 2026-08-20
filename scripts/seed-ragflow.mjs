// biome-ignore-all lint/performance/noAwaitInLoops: Upload and polling are intentionally serialized to protect the RAGFlow worker.

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env.local") });

const base = (process.env.RAGFLOW_BASE_URL || "http://localhost:9380").replace(
  /\/+$/,
  ""
);
const apiBase = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
const apiKey = process.env.RAGFLOW_API_KEY;
const datasetId =
  process.env.RAGFLOW_DATASET_ID ||
  process.env.RAGFLOW_DATASET_IDS?.split(",")[0]?.trim();
const configuredPath =
  process.env.RAGFLOW_DOCUMENT_PATH || process.env.RAGFLOW_DOCUMENT_DIR;
const reparseExisting =
  process.env.RAGFLOW_REPARSE_EXISTING?.toLowerCase() === "true";
const parseTimeoutMs = Number(
  process.env.RAGFLOW_PARSE_TIMEOUT_MS || 1_800_000
);
const headers = { authorization: `Bearer ${apiKey}` };

async function resolveFiles() {
  const target = configuredPath || path.resolve("data/principles-corpus.md");
  const stat = await fs.stat(target);
  if (stat.isDirectory()) {
    const names = await fs.readdir(target);
    return names
      .filter((name) => /\.(pdf|md|txt|docx?|pptx?|xlsx?|csv)$/i.test(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => path.join(target, name));
  }
  return [target];
}

if (!apiKey || !datasetId) {
  throw new Error("Set RAGFLOW_API_KEY and RAGFLOW_DATASET_ID before seeding.");
}
const files = await resolveFiles();
if (!files.length) {
  throw new Error(`No supported documents found in ${configuredPath}.`);
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    (payload.code !== undefined && Number(payload.code) !== 0)
  ) {
    throw new Error(
      `RAGFlow request failed: HTTP ${response.status} ${JSON.stringify(payload)}`
    );
  }
  return payload;
}

async function listDocuments() {
  const response = await fetch(
    `${apiBase}/datasets/${encodeURIComponent(datasetId)}/documents?page=1&page_size=1000&orderby=create_time&desc=false`,
    { headers }
  );
  const payload = await readJson(response);
  return Array.isArray(payload?.data?.docs) ? payload.data.docs : [];
}

async function documentById(id) {
  const response = await fetch(
    `${apiBase}/datasets/${encodeURIComponent(datasetId)}/documents?id=${encodeURIComponent(id)}&page=1&page_size=1`,
    { headers }
  );
  const payload = await readJson(response);
  return Array.isArray(payload?.data?.docs) ? payload.data.docs[0] : null;
}

const existingDocuments = await listDocuments();
const documentIds = new Set();
const parseIds = new Set();

for (const filePath of files) {
  const displayName = path.basename(filePath);
  const existing = existingDocuments.find(
    (document) =>
      String(document.name ?? document.display_name ?? "").trim() ===
      displayName
  );
  if (existing?.id) {
    documentIds.add(existing.id);
    if (reparseExisting) {
      parseIds.add(existing.id);
    }
    console.log(
      JSON.stringify({
        action: reparseExisting ? "reparse" : "reuse",
        file: displayName,
        id: existing.id,
      })
    );
    continue;
  }

  const file = await fs.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([file]), displayName);
  const response = await fetch(
    `${apiBase}/datasets/${encodeURIComponent(datasetId)}/documents`,
    {
      body: form,
      headers,
      method: "POST",
    }
  );
  const payload = await readJson(response);
  const uploaded = Array.isArray(payload?.data)
    ? payload.data
    : [payload?.data];
  for (const document of uploaded) {
    if (document?.id) {
      documentIds.add(document.id);
      parseIds.add(document.id);
    }
  }
  console.log(
    JSON.stringify({
      action: "uploaded",
      file: displayName,
      ids: uploaded.map((document) => document?.id).filter(Boolean),
    })
  );
}

if (parseIds.size) {
  const response = await fetch(
    `${apiBase}/datasets/${encodeURIComponent(datasetId)}/chunks`,
    {
      body: JSON.stringify({ document_ids: [...parseIds] }),
      headers: { ...headers, "content-type": "application/json" },
      method: "POST",
    }
  );
  await readJson(response);
  console.log(`Started RAGFlow parsing for ${parseIds.size} document(s).`);

  const startedAt = Date.now();
  const pending = new Set(parseIds);
  while (pending.size && Date.now() - startedAt < parseTimeoutMs) {
    for (const id of [...pending]) {
      const document = await documentById(id);
      const run = String(document?.run ?? document?.status ?? "").toUpperCase();
      const progress = Number(document?.progress ?? 0);
      if (run === "FAIL" || run === "CANCEL") {
        throw new Error(
          `RAGFlow parsing failed for ${id}: ${JSON.stringify(document)}`
        );
      }
      if (run === "DONE" || progress >= 1) {
        pending.delete(id);
        console.log(
          JSON.stringify({
            chunkCount: document?.chunk_count ?? null,
            id,
            progress,
            run: run || "DONE",
            tokenCount: document?.token_count ?? null,
          })
        );
      }
    }
    if (pending.size) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  if (pending.size) {
    throw new Error(
      `RAGFlow parsing timed out after ${parseTimeoutMs}ms for ${pending.size} document(s).`
    );
  }
} else {
  console.log(
    "No new or explicitly reparsed documents. Existing RAGFlow chunks were left unchanged."
  );
}

console.log(
  `Prepared ${documentIds.size} document(s) in dataset ${datasetId}.`
);
