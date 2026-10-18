import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Inngest calls this endpoint to run the background jobs.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
