import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { strictSsl } from "./url";

// Server only. One pool per server process. On Vercel, DATABASE_URL is
// Neon's pooled connection string; locally, the Docker database
// (docker-compose.yml). The pool connects on its first query, and `next dev`
// re-runs modules on every edit, so it lives on globalThis.

const globalForDb = globalThis as unknown as { inkPool?: Pool };

const pool = (globalForDb.inkPool ??= new Pool({ connectionString: strictSsl(process.env.DATABASE_URL), max: 5 }));

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
