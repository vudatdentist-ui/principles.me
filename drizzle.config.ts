import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: process.env.ENV_FILE || ".env.local",
});

export default defineConfig({
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "",
  },
  dialect: "postgresql",
  out: "./lib/db/migrations",
  schema: [
    "./lib/db/schema.ts",
    "./lib/journal/schema.ts",
    "./lib/goals/schema.ts",
  ],
});
