import { defineConfig } from "drizzle-kit";

import { strictSsl } from "./lib/db/url";

// `bun db:generate` writes a migration from lib/db/schema.ts into drizzle/;
// `bun db:migrate` applies them to DATABASE_URL, or to Neon's direct
// connection (DATABASE_URL_UNPOOLED) when it's set: migrations are better
// off without the pooler.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: strictSsl(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)! },
  casing: "snake_case",
});
