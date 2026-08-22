import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(repositoryRoot, "lib", "db", "migrations");
const journalPath = join(migrationsDir, "meta", "_journal.json");

const immutableBaseline = [
  "0000_initial",
  "0001_decision_domain",
  "0002_decision_workspace",
  "0003_council_v1",
  "0004_judgment_loop",
  "0005_learning_loop",
  "0006_cortex_run",
  "0007_journal_reflection",
  "0008_goals_loop",
  "0009_decision_run",
];

const journal = JSON.parse(readFileSync(journalPath, "utf8"));
if (!Array.isArray(journal.entries)) {
  throw new Error("Migration journal entries are missing.");
}

const entries = journal.entries;
for (const [index, entry] of entries.entries()) {
  if (entry.idx !== index) {
    throw new Error(
      `Migration journal index mismatch at ${entry.tag ?? index}: expected ${index}, got ${entry.idx}.`
    );
  }

  if (index > 0 && entry.when <= entries[index - 1].when) {
    throw new Error(`Migration timestamps must increase strictly at ${entry.tag}.`);
  }
}

const tags = entries.map((entry) => entry.tag);
for (const [index, tag] of immutableBaseline.entries()) {
  if (tags[index] !== tag) {
    throw new Error(
      `Released migration history changed at index ${index}: expected ${tag}, got ${tags[index] ?? "missing"}.`
    );
  }
}

const sqlFiles = readdirSync(migrationsDir)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
const journalFiles = tags.map((tag) => `${tag}.sql`).sort();

if (sqlFiles.length !== journalFiles.length) {
  throw new Error(
    `Migration file count (${sqlFiles.length}) does not match journal count (${journalFiles.length}).`
  );
}

for (const [index, file] of sqlFiles.entries()) {
  if (file !== journalFiles[index]) {
    throw new Error(
      `Migration file/journal mismatch: expected ${journalFiles[index]}, found ${file}.`
    );
  }
}

console.log(
  `Verified ${entries.length} migrations; released history through 0009_decision_run is intact.`
);
