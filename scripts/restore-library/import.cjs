// Runs inside a fresh, private AnythingLLM container before it serves the app.
const fs = require("node:fs");
const path = require("node:path");
const {randomUUID} = require("node:crypto");
const {Workspace} = require("/app/server/models/workspace");
const {ApiKey} = require("/app/server/models/apiKeys");
const prisma = require("/app/server/utils/prisma");
const {storeVectorResult,cachedVectorInformation} = require("/app/server/utils/files");
const {getVectorDbClass} = require("/app/server/utils/helpers");

async function main() {
  const db = getVectorDbClass();
  if (db.name !== "LanceDb") throw Error("Expected LanceDB");
  const {workspace} = await Workspace.new("Finance and Economic Library");
  if (workspace?.slug !== "finance-and-economic-library") throw Error("Expected fresh library");
  const src = "/tmp/principles-books";
  const catalog = JSON.parse(fs.readFileSync(path.join(src,"books.json")));
  const docs = path.join(process.env.STORAGE_DIR,"documents","custom-documents");
  fs.mkdirSync(docs,{recursive:true});
  let total = 0;
  for(const name of catalog) {
    if (path.basename(name) !== name) throw Error("Unexpected document path");
    const doc = JSON.parse(fs.readFileSync(path.join(src,name)));
    const batches = JSON.parse(fs.readFileSync(path.join(src,name+".vectors")));
    let count = 0;
    for(const batch of batches) for(const row of batch) {
      if (!Array.isArray(row.values) || row.values.length !== 384 || !row.values.every(Number.isFinite) || !row.metadata.text) throw Error("Invalid book vector");
      // Keep a consistent LanceDB schema across releases with different optional metadata.
      const m = row.metadata;
      row.metadata = {text:m.text, title:doc.title, author:String(m.author || doc.docAuthor || ""), chapter:String(m.chapter || ""), section:String(m.section || ""), source_loc:String(m.source_loc || ""), chunkSource:String(m.chunkSource || doc.chunkSource || ""), chunk_id:String(m.chunk_id || row.id || "")};
      count++;
    }
    if (!count || !doc.title || !doc.pageContent) throw Error("Empty book");
    const rel = "custom-documents/"+name;
    fs.copyFileSync(path.join(src,name),path.join(docs,name));
    await storeVectorResult(batches,rel);
    if (!(await cachedVectorInformation(rel,true))) throw Error("Vector cache missing");
    const docId = randomUUID();
    const result = await db.addDocumentToNamespace(workspace.slug,{...doc,docId},rel);
    total += count;
    if (!result.vectorized || await db.namespaceCount(workspace.slug) !== total) throw Error("Vector import count mismatch");
    const {pageContent, ...metadata} = doc;
    await prisma.workspace_documents.create({data:{docId,filename:name,docpath:rel,workspaceId:workspace.id,metadata:JSON.stringify(metadata)}});
    console.log("Imported",doc.title,count);
  }
  const {apiKey} = await ApiKey.create(null,"Principles application");
  if (!apiKey?.secret) throw Error("Missing service credential");
  fs.writeFileSync("/tmp/principles-service-key",apiKey.secret,{mode:0o600});
  console.log("Verified total vectors",total);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});
