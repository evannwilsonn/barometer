import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth's endpoints (sign-up, sign-in, sign-out, session), created on first request.
const handler = (req: Request) => {
  const h = toNextJsHandler(auth());
  return req.method === "POST" ? h.POST(req) : h.GET(req);
};

export { handler as GET, handler as POST };
