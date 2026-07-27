// Vercel proxies group APIs to the deployed Cloudflare backend. This module is
// only a build-time stand-in so Next.js can compile Cloudflare's virtual import.
export const env = {
  DB: undefined,
};
