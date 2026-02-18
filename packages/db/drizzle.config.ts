import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env from monorepo root
config({ path: path.resolve(import.meta.dirname, "../../.env") });

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set in .env");
}

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
});
