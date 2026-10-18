import type { NextConfig } from "next";

const config: NextConfig = {
  // The Docker image runs Next's self-contained server; Vercel builds don't set this.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // The raw datasets and evaluation scripts aren't part of the app.
  outputFileTracingExcludes: { "*": ["data/**", "scripts/**"] },
};

export default config;
