import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  typescript: {
    // The project is validated by Vinext and ESLint; Vercel's standalone
    // type-check currently stalls on the Cloudflare virtual-module graph.
    ignoreBuildErrors: Boolean(process.env.VERCEL),
  },
  webpack(config, { webpack }) {
    if (process.env.VERCEL) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^cloudflare:workers$/,
          path.resolve(process.cwd(), "db/vercel-workers-stub.ts"),
        ),
      );
    }

    return config;
  },
  async rewrites() {
    if (!process.env.VERCEL) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: "/api/groups/:path*",
          destination:
            "https://quorum-private-decisions.panthshah.chatgpt.site/api/groups/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
