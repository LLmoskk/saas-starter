import { loadEnvFile, resolveEnvProfileFromProcess } from "@starter/env/load-env";
import { defineConfig } from "drizzle-kit";

loadEnvFile(resolveEnvProfileFromProcess());

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
