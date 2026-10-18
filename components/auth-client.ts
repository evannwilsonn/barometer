"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// The browser side of Better Auth. It talks to /api/auth on this site.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields({
    user: {
      country: { type: "string", required: false },
      investmentGoals: { type: "string", required: false },
      riskTolerance: { type: "string", required: false },
      preferredIndustry: { type: "string", required: false },
    },
  })],
});
