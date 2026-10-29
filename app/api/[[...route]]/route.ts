import { handle } from "hono/vercel";

import { app } from "@/lib/api/server";

// Every /api request goes to the Hono app (lib/api/server.ts): Better Auth at
// /api/auth/*, Ink's API at /api/v1/*. A review can stream for a while.

export const maxDuration = 300;

const handler = handle(app);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
