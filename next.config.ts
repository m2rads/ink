import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The essay's word count has the bottom-left corner.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  // Grammalecte reads its engine and dictionary from disk at runtime
  // (lib/grammar.ts), which file tracing can't see.
  outputFileTracingIncludes: { "/*": ["./vendor/grammalecte/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
