import fs from "node:fs/promises";

const sourcePath = process.argv[2] || "C:/Users/Admin/Desktop/index.html";
const outputPath = process.argv[3] || "public/brain.glb";
const html = await fs.readFile(sourcePath, "utf8");
const match = html.match(/const BRAIN_GLB_B64 = "([^"]+)"/);

if (!match) {
  throw new Error(`BRAIN_GLB_B64 was not found in ${sourcePath}`);
}

await fs.mkdir("public", { recursive: true });
await fs.writeFile(outputPath, Buffer.from(match[1], "base64"));
console.log(`Extracted ${outputPath}`);
