// One MongoDB connection per server process, shared by Better Auth (users, sessions) and the
// logbook. Cached on globalThis so hot reloads in development don't open a new pool each time.

import { MongoClient, type Db } from "mongodb";

const g = globalThis as unknown as { __mongo?: MongoClient };

export function mongo(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI isn't set; accounts and the logbook need a MongoDB database (see .env.example)");
  if (!g.__mongo) g.__mongo = new MongoClient(uri, { appName: "barometer" });
  return g.__mongo;
}

/** The app's database: the one named in MONGODB_URI (or MONGODB_DB), else "test" per the driver. */
export const db = (): Db => mongo().db(process.env.MONGODB_DB || undefined);

export type LogbookEntry = { userId: string; symbol: string; company: string; addedAt: Date };

let indexed: Promise<unknown> | null = null;

/** The logbook collection: one document per user and symbol. */
export async function logbook() {
  const c = db().collection<LogbookEntry>("logbook");
  indexed ??= c.createIndex({ userId: 1, symbol: 1 }, { unique: true });
  await indexed;
  return c;
}
