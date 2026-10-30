import { createHash, randomBytes } from "node:crypto";

import { auth } from "./auth";

// Signing in the Mac app (AGENTS.md, Accounts and sync): OAuth's
// authorization code with PKCE, without an OAuth server. The app opens
// /connect/mac with a random state and the SHA-256 of a verifier only it
// knows; the writer, signed in on the web, presses Connect, and the page
// gets a one-time code for the app's callback (encre://connect). The app
// trades the code and its verifier for a session of its own, sent as
// `Authorization: Bearer`. A code read along the way is no use without the
// verifier. Server only.
//
// A code is kept as a Better Auth verification value, by its hash only:
// single use (spent on the first try, right or wrong) and good for 5 minutes.

const CODE_MINUTES = 5;
/** How the app's sessions show among the account's sessions. */
const USER_AGENT = "Encre for Mac";

const sha256 = (text: string, encoding: "hex" | "base64url") => createHash("sha256").update(text).digest(encoding);
const identifier = (code: string) => `mac-connect:${sha256(code, "hex")}`;

/** A one-time code for the signed-in user, bound to the app's challenge. */
export async function createConnectCode(userId: string, challenge: string): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const { internalAdapter } = await auth.$context;
  await internalAdapter.createVerificationValue({
    identifier: identifier(code),
    value: JSON.stringify({ userId, challenge }),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
  });
  return code;
}

/**
 * The code's user signed in on the app: a new session and who it is. Null
 * for a code that's wrong, used, expired, or sent without its verifier.
 */
export async function redeemConnectCode(code: string, verifier: string, ip: string) {
  const { internalAdapter } = await auth.$context;
  // Spent here, before the verifier is checked; null once expired.
  const found = await internalAdapter.consumeVerificationValue(identifier(code));
  if (!found) return null;
  const { userId, challenge } = JSON.parse(found.value) as { userId: string; challenge: string };
  if (sha256(verifier, "base64url") !== challenge) return null;
  const user = await internalAdapter.findUserById(userId);
  if (!user) return null;
  const session = await internalAdapter.createSession(user.id, false, { userAgent: USER_AGENT, ipAddress: ip === "unknown" ? "" : ip });
  return { token: session.token, user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null } };
}
