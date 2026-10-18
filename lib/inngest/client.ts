// Background jobs run by Inngest: the welcome email and the morning dispatch.
// Locally, set INNGEST_DEV=1 and run the Inngest dev server; in production, set
// INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY from the Inngest dashboard.

import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "barometer" });
