import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const repositoryRoot = path.resolve(process.cwd(), "..");
const exploreHotspotsPlayEntry = path.join(
  repositoryRoot,
  "packages/explore-hotspots-play/src/index.ts",
);
const exploreHotspotsAuthorEntry = path.join(
  repositoryRoot,
  "packages/explore-hotspots-author/src/index.ts",
);

// These local-only endpoints patch source files through process.cwd(). Next's
// file tracer consequently treats the whole web project as a runtime dependency.
// Keep static assets and development artifacts out of their inert production
// functions; each endpoint returns 403 before touching the filesystem in prod.
const devSourceWriterTraceExcludes = ["./public/**/*", "./docs/**/*", "./tmp/**/*"];

function supabaseStoragePattern():
  | {
      protocol: "https";
      hostname: string;
      pathname: string;
    }
  | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const host = new URL(raw).hostname;
    if (!host) return undefined;
    return {
      protocol: "https",
      hostname: host,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/api/dev/apply-letter-fruit-picks": devSourceWriterTraceExcludes,
    "/api/dev/apply-letter-fruit-plot-picks": devSourceWriterTraceExcludes,
    "/api/dev/apply-wke-path-picks": devSourceWriterTraceExcludes,
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.2.84"],
  transpilePackages: ["@wke/explore-hotspots-play", "@wke/explore-hotspots-author"],
  turbopack: {
    // Local file dependencies live beside web/, outside the auto-detected root.
    root: repositoryRoot,
    resolveAlias: {
      // Node-only ONNX backend used by @huggingface/transformers — stub in browser.
      "onnxruntime-node": "./lib/empty-module.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@wke/explore-hotspots-play": exploreHotspotsPlayEntry,
      "@wke/explore-hotspots-author": exploreHotspotsAuthorEntry,
      "onnxruntime-node$": false,
    };
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    // Learning-track preview posts can embed recorded vocab audio/images as data URLs.
    // Default proxy buffer is 10MB; a hobbies list with flashcards + letter scramble is ~10.7MB.
    proxyClientMaxBodySize: "32mb",
  },
  headers: async () => {
    const studioOrigins = (
      process.env.STUDIO_FRAME_ANCESTORS?.trim() ||
      "http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000 http://127.0.0.1:3001"
    )
      .split(/\s+/)
      .filter(Boolean)
      .join(" ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Allow EDU Studio to embed pilots in the Learning Track Compiler.
          // Prefer CSP frame-ancestors over X-Frame-Options (which cannot list other origins).
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${studioOrigins}`,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      ...(() => {
        const p = supabaseStoragePattern();
        return p ? [p] : [];
      })(),
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
