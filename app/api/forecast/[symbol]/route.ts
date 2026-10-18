import { report } from "@/lib/station";
import { SourceError } from "@/lib/sources";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  try {
    return Response.json(await report(decodeURIComponent(symbol)), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (e) {
    const status = e instanceof SourceError ? e.status : 500;
    const message = e instanceof Error ? e.message : "something went wrong";
    return Response.json({ error: message }, { status });
  }
}
