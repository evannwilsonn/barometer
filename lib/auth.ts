// Accounts: Better Auth with email and password, users and sessions stored in MongoDB.
// Created lazily, so the public forecast pages still build and run without a database.

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db, mongo } from "./db";
import { inngest } from "./inngest/client";

/** The questions asked at sign-up; the welcome note is written from the answers. */
export const PROFILE = {
  investmentGoals: ["Growth", "Income", "Balanced", "Conservative"],
  riskTolerance: ["Low", "Medium", "High"],
  preferredIndustry: ["Technology", "Healthcare", "Finance", "Energy", "Consumer goods"],
} as const;

const field = { type: "string", required: false, input: true } as const;

function create() {
  return betterAuth({
    // Transactions need a replica set, which Atlas always is; a standalone local mongod isn't,
    // so it runs with MONGODB_TRANSACTIONS=false.
    database: mongodbAdapter(db(), { client: mongo(), transaction: process.env.MONGODB_TRANSACTIONS !== "false" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true },
    user: { additionalFields: { country: field, investmentGoals: field, riskTolerance: field, preferredIndustry: field } },
    databaseHooks: {
      user: {
        create: {
          // Hand the welcome email to Inngest; a sign-up never waits on (or fails because of) email.
          after: async user => {
            const u = user as typeof user & Record<"country" | "investmentGoals" | "riskTolerance" | "preferredIndustry", string | undefined>;
            await inngest
              .send({ name: "app/user.created", data: { id: u.id, email: u.email, name: u.name, country: u.country, investmentGoals: u.investmentGoals, riskTolerance: u.riskTolerance, preferredIndustry: u.preferredIndustry } })
              .catch(e => console.error("couldn't queue the welcome email:", (e as Error).message));
          },
        },
      },
    },
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
