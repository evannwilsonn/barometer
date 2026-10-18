"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// The browser side of Better Auth. It talks to /api/auth on this site.
export const authClient = createAuthClient({
  // A request that hasn't answered in 20 seconds is given up on, so the form shows an error
  // instead of sitting on "One moment…" forever.
  fetchOptions: { timeout: 20_000 },
  plugins: [inferAdditionalFields({
    user: {
      country: { type: "string", required: false },
      preferredIndustry: { type: "string", required: false },
      termsAcceptedAt: { type: "string", required: false },
    },
  })],
});
