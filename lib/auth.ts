import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer, emailOTP } from "better-auth/plugins";

import { db } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";

// Accounts (Better Auth). Two ways in, both creating the account on first use:
//
// - Email: one email with a 6-digit code and a link. The code is typed where
//   the writer asked for it, so it works when the link would open in another
//   browser (Gmail's own). The link carries the code in its #fragment (never
//   sent to a server or its logs) to a page with a "Sign in" button, so a mail
//   scanner opening links can't use it up.
// - Google, once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
//
// The web app is signed in by a cookie; the Mac app sends the session token
// as `Authorization: Bearer` (the bearer plugin). Server only.
//
// BETTER_AUTH_SECRET signs sessions, BETTER_AUTH_URL is the app's own origin.

const CODE_MINUTES = 10;

export const auth = betterAuth({
  appName: "Ink",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema, rateLimit: schema.authRateLimit },
  }),
  session: {
    // A writer shouldn't be signed out between study sessions.
    expiresIn: 60 * 60 * 24 * 60,
    updateAge: 60 * 60 * 24,
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account" } }
      : {},
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    customRules: {
      // Each send is an email: few, so the form can't be used to flood an inbox.
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 10 },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: CODE_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        await sendEmail(signInEmail(email, otp));
      },
    }),
    bearer(),
    // Last: lets server actions set the session cookie.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

/** The signed-in user for a request (cookie or bearer token), or null. */
export async function userFrom(headers: Headers): Promise<User | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
}

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function signInEmail(email: string, code: string) {
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const link = `${origin}/sign-in#${new URLSearchParams({ email, code })}`;
  const text = [
    `Your Ink sign-in code is ${code}`,
    "",
    `Type it where you asked for it, or open this link to sign in here:`,
    link,
    "",
    `The code works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a">
<p>Your Ink sign-in code is</p>
<p style="font-size:32px;font-weight:600;letter-spacing:0.15em;margin:8px 0 24px">${code}</p>
<p>Type it where you asked for it, or <a href="${link}">sign in with this link</a>.</p>
<p style="color:#666;font-size:14px">The code works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  return { to: email, subject: `${code} is your Ink sign-in code`, text, html };
}
