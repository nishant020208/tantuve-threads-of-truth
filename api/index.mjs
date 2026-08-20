// Vercel Edge Function — catches all routes and delegates to the TanStack Start server.
// The build produces dist/server/server.js with a Cloudflare Workers–compatible
// `fetch(request, env, ctx)` handler. Edge Runtime supports Web Standard Request/Response,
// so we can forward directly.

export const config = { runtime: "edge" };

export default async function handler(request) {
  const { default: server } = await import("../dist/server/server.js");
  return server.fetch(request, {}, {});
}
