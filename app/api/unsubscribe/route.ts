import { ObjectId } from "mongodb";
import { users } from "@/lib/auth";
import { site, validUnsubscribe } from "@/lib/mail";

// One-click unsubscribe from the morning dispatch. GET is the link in the email; POST is what
// mail apps send for the List-Unsubscribe-Post header (RFC 8058). The signed token means a link
// can only switch off the dispatch for the reader it was sent to.
async function stop(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "", t = url.searchParams.get("t") ?? "";
  if (!ObjectId.isValid(u) || !validUnsubscribe(u, t)) return false;
  await users().updateOne({ _id: new ObjectId(u) }, { $set: { dispatch: false } });
  return true;
}

export async function GET(req: Request) {
  const ok = await stop(req);
  return Response.redirect(`${site()}/legal?unsubscribed=${ok ? "1" : "0"}#dispatch`, 303);
}

export async function POST(req: Request) {
  const ok = await stop(req);
  return new Response(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
}
