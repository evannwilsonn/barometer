// Accounts: Better Auth with email and password, users and sessions stored in MongoDB.
// Created lazily, so the public forecast pages still build and run without a database.
//
// Email is verified before an account can sign in, so the site never emails an address
// whose owner didn't sign up. Readers can reset a forgotten password, stop the morning
// dispatch, and delete their account and logbook.

import { betterAuth } from "better-auth";
import type { ObjectId } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { db, logbook, mongo } from "./db";
import { inngest } from "./inngest/client";
import { actionEmail } from "./mail";

/**
 * The one optional question at sign-up, used only to suggest a first stock to look up.
 * Barometer deliberately doesn't ask about investment goals or risk tolerance: it publishes
 * the same readings to everyone and doesn't tailor anything to a reader's finances.
 */
export const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Energy", "Consumer goods"] as const;

const field = { type: "string", required: false, input: true } as const;

function create() {
  return betterAuth({
    // Transactions need a replica set, which Atlas always is; a standalone local mongod isn't,
    // so it runs with MONGODB_TRANSACTIONS=false.
    database: mongodbAdapter(db(), { client: mongo(), transaction: process.env.MONGODB_TRANSACTIONS !== "false" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await actionEmail(user.email, "Reset your Barometer password", "Reset your password",
          "Someone asked to reset the password for this Barometer account. If it was you, use the button below; the link works for one hour. If it wasn't, ignore this email and your password stays the same.",
          "Choose a new password", url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await actionEmail(user.email, "Confirm your email for Barometer", "Confirm your email",
          "Confirm this address to open your Barometer logbook. The link works for one hour. If you didn't sign up, ignore this email: no account will be activated and you won't hear from us again.",
          "Confirm my email", url);
      },
      // The welcome email waits for a confirmed address. Inngest sends it, so confirming never
      // waits on (or fails because of) email.
      afterEmailVerification: async user => {
        const u = user as typeof user & { preferredIndustry?: string };
        await inngest
          .send({ name: "app/user.verified", data: { id: u.id, email: u.email, name: u.name, preferredIndustry: u.preferredIndustry } })
          .catch(e => console.error("couldn't queue the welcome email:", (e as Error).message));
      },
    },
    user: {
      additionalFields: {
        country: field,
        preferredIndustry: field,
        // Whether to send the morning dispatch; readers turn it off from the logbook or any email.
        dispatch: { type: "boolean", required: false, input: false, defaultValue: true },
        termsAcceptedAt: { type: "string", required: false, input: true },
      },
      deleteUser: {
        enabled: true,
        afterDelete: async user => {
          await (await logbook()).deleteMany({ userId: user.id });
        },
      },
    },
    // Emails (confirm, reset) go out after the response is sent, so signing up or in never waits
    // on the mail server. after() keeps the serverless function alive until the send finishes.
    advanced: { backgroundTasks: { handler: p => after(p) } },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof create>;
const g = globalThis as unknown as { __auth?: Auth };

/** True when the deployment has a database, so accounts and the logbook are on. */
export const accountsOn = () => Boolean(process.env.MONGODB_URI);

export function auth(): Auth {
  g.__auth ??= create();
  return g.__auth;
}

/** The signed-in user for this request, or null (also null when accounts are off). */
export async function currentUser() {
  if (!accountsOn()) return null;
  const s = await auth().api.getSession({ headers: await headers() }).catch(() => null);
  return s?.user ?? null;
}

/** The users collection, for the dispatch and unsubscribe (Better Auth names it "user"). */
export const users = () => db().collection<{ _id: ObjectId; email: string; name: string; emailVerified?: boolean; dispatch?: boolean }>("user");
