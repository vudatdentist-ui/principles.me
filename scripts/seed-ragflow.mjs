import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('.env.local') });

const base = (process.env.RAGFLOW_BASE_URL || 'http://localhost:9380').replace(/\/+$/, '');
const apiBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
const apiKey = process.env.RAGFLOW_API_KEY;
const datasetId = process.env.RAGFLOW_DATASET_ID || process.env.RAGFLOW_DATASET_IDS?.split(',')[0]?.trim();
const configuredPath = process.env.RAGFLOW_DOCUMENT_PATH || process.env.RAGFLOW_DOCUMENT_DIR;

async function resolveFiles() {
  const target = configuredPath || path.resolve('data/principles-corpus.md');
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

if (!apiKey || !datasetId) throw new Error('Set RAGFLOW_API_KEY and RAGFLOW_DATASET_ID before seeding.');
const files = await resolveFiles();
if (!files.length) throw new Error(`No supported documents found in ${configuredPath}.`);

for (const filePath of files) {
  const file = await fs.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([file]), path.basename(filePath));
  const response = await fetch(`${apiBase}/datasets/${encodeURIComponent(datasetId)}/documents`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code !== undefined && Number(payload.code) !== 0)) {
    throw new Error(`RAGFlow document upload failed for ${path.basename(filePath)}: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  console.log(JSON.stringify({ file: path.basename(filePath), response: payload }, null, 2));
}

console.log(`Uploaded ${files.length} document(s) to dataset ${datasetId}.`);
