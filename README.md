# Principles — Thinker Machine

Principles is a new application built from the Vercel `chatbot` Next.js base, with a visual language based on the supplied `C:\Users\Admin\Desktop\index.html`. The Brain is the `Thinker Machine` surface: one processing system with isolated reasoning contexts, not a set of simulated personalities.

## Architecture

- `Next.js App Router` owns the UI and the server-side Thinker Machine endpoint.
- `React Three Fiber + Three.js` renders the existing interactive Brain/Graph/Constellation/Council modes; the Brain renderer remains in `components/brain-scene.tsx`.
- `RAGFlow` remains a separate service. The app only calls its `/api/v1/retrieval` HTTP API for the primary source corpus.
- `DeepSeek` runs the reasoning modules and the final Synthesis Judge.
- `lib/thinker-machine.ts` defines the reasoning budget and isolated processing passes.
- `lib/principles-graph.ts` is the Principles graph model. It does not reuse GraphRAG Workbench's entity/relationship schema.
- `public/brain.glb` is the brain mesh extracted from the supplied UI reference; the R3F renderer samples it into morphing particles and shards.
- GraphRAG Workbench was researched for its renderer approach and interaction patterns; its application source is not included here.

### Thinker Machine pipeline

```text
Question + optional Principles Me context
                 │
                 ▼
        RAGFlow retrieval (primary)
                 │
                 ├── optional Web Researcher (only when enabled and needed)
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │ Isolated reasoning contexts                  │
  │ Evidence · First Principles · Inversion      │
  │ Systems · Action                             │
  └────────────────────┬────────────────────────┘
                       ▼
                 Synthesis Judge
                       │
                       ▼
             Principles Thinker response
```

The Evidence Analyst receives the evidence packet. The independent passes intentionally do not receive that packet or each other's output; they get a fresh context with their own role prompt. The Synthesis Judge receives the raw evidence plus the isolated outputs. Citation keys are accepted only if they exist in the raw retrieved packet.

Reasoning modes:

- `Adaptive`: selects three passes for a straightforward question and five for a complex one.
- `High`: always runs all five isolated passes and synthesis.
- `Max`: High plus a critic pass and a final synthesis revision.

Web research is an explicit user-controlled supplement. It is never silently called, never treated as a personality, and never automatically imported into RAGFlow or Principles Me.

## Local run

Requirements: Node 20+, pnpm, and Docker Desktop for RAGFlow.

```powershell
pnpm install
Copy-Item .env.example .env.local
# Fill DEEPSEEK_API_KEY, then configure RAGFlow values in .env.local. TAVILY_API_KEY is optional.
pnpm dev
```

Open `http://localhost:3000`.

If the supplied reference asset changes, regenerate the mesh with `pnpm brain:extract`.

## RAGFlow service

RAGFlow is intentionally not merged into this Next.js project. To bootstrap the official pinned service locally:

```powershell
pnpm ragflow:bootstrap
```

The script clones the official RAGFlow repository at `v0.26.4` into `infra/ragflow/upstream` and runs its own Docker Compose stack. RAGFlow requires a Docker host with at least 4 CPU cores, 16 GB RAM and 50 GB disk; initialization can take several minutes.

After the RAGFlow UI is ready:

1. Create a dataset and an API key in RAGFlow.
2. Set `RAGFLOW_API_KEY` and `RAGFLOW_DATASET_IDS` in `.env.local`.
3. Upload a corpus (the seeder accepts one file or a directory):

```powershell
$env:RAGFLOW_API_KEY='your-ragflow-key'
$env:RAGFLOW_DATASET_ID='your-dataset-id'
$env:RAGFLOW_DOCUMENT_DIR='C:\Users\Admin\Desktop\Source'
pnpm ragflow:seed
```

`RAGFLOW_DOCUMENT_DIR` accepts PDF, Markdown, text, Word, PowerPoint, Excel and CSV files. The seeder uploads each file with its original filename, so RAGFlow keeps provenance per document. Use licensed or user-owned primary sources for production research.

## Verification

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

For a browser smoke test, start the app and verify:

`Home → Thinker Machine → mode selection → RAGFlow → isolated passes → Synthesis Judge → Sources → Brain mode morph`

When RAGFlow is not configured or returns no chunks, the UI explicitly shows the evidence gap and the API will not invent citations. Independent reasoning may still be shown, but it is not presented as source-backed fact. When DeepSeek is unavailable, the stream shows an error instead of presenting a fabricated answer.

## Deploy

For the current Hostinger VPS deployment, the Next.js app and RAGFlow remain separate Docker services. The app uses `docker-compose.hostinger.yml` and Traefik on the existing `coolify` network:

```bash
docker compose -f docker-compose.hostinger.yml up -d --build
```

Create these Cloudflare DNS records before requesting the TLS certificate:

- `A @` → `187.127.116.53` (proxied)
- `A www` → `187.127.116.53` (proxied)

RAGFlow is managed independently under `infra/ragflow/upstream/docker`; its API is not merged into Next.js. For a fresh VPS, bootstrap it with `pnpm ragflow:bootstrap`, enable a TEI embedding profile, create a dataset/API key, then seed with `pnpm ragflow:seed`.

For Vercel deployments, configure the following project environment variables:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` (default `deepseek-chat`)
- `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`)
- `DEEPSEEK_MAX_TOKENS`, `DEEPSEEK_TIMEOUT_MS`, `DEEPSEEK_SYNTHESIS_TIMEOUT_MS`
- `RAGFLOW_BASE_URL`
- `RAGFLOW_API_KEY`
- `RAGFLOW_DATASET_IDS`
- `TAVILY_API_KEY` (optional; only used when Web Research is enabled)

Then:

```powershell
npx vercel --prod
```

On Windows, if the CLI reports an `EPERM` symlink error while creating `.vercel/output`, enable Windows Developer Mode (or deploy from a Linux CI runner). The local app itself does not require symlink privileges.

Do not commit `.env.local` or API keys. A deployment without reachable RAGFlow will still load the visual app, but Thinker Machine will correctly report the missing evidence and keep citations empty.
