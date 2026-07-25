import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/**
 * Relative to the Lesson Player `web/` app root.
 * Turbopack rejects absolute Windows paths in resolveAlias ("windows imports are not implemented yet").
 */
const exploreHotspotsPlayEntry =
  "../../WKE Animator/svg-edu-studio/packages/explore-hotspots-play/src/index.ts";

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
  transpilePackages: ["@wke/explore-hotspots-play"],
  turbopack: {
    resolveAlias: {
      "@wke/explore-hotspots-play": exploreHotspotsPlayEntry,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@wke/explore-hotspots-play": exploreHotspotsPlayEntry,
    };
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
  ],
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
