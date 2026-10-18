import type { NextConfig } from "next";

const config: NextConfig = {
  // The raw datasets and evaluation scripts aren't part of the app.
  outputFileTracingExcludes: { "*": ["data/**", "scripts/**"] },
};

export default config;
