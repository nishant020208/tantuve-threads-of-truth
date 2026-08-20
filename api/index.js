/**
 * Vercel serverless function — wraps the TanStack Start SSR server.
 *
 * TanStack Start's Vite build produces dist/server/server.js which exports
 * a Cloudflare-Workers-style `fetch(request, env, ctx)` handler.
 * This adapter bridges it to Vercel's Node.js runtime by converting
 * the Node.js IncomingMessage → Web Request, calling the handler, and
 * converting Web Response → Node.js ServerResponse.
 */
export default async function handler(req, res) {
  try {
    // Dynamic import so Vercel can resolve the path at runtime.
    // @vercel/node includes project files in the function bundle.
    const { default: server } = await import("../dist/server/server.js");

    // Build the full URL the upstream handler expects.
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || "localhost";
    const url = `${proto}://${host}${req.url}`;

    // Convert Node.js headers → Web Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
    }

    // Build a Web Standard Request
    const init = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      // Node.js IncomingMessage is a readable stream — pass it as body.
      init.body = req;
      init.duplex = "half"; // Required by the Fetch spec for streaming bodies.
    }

    const webRequest = new Request(url, init);
    const webResponse = await server.fetch(webRequest, process.env, {});

    // Pipe the Web Response back through Node.js res
    res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
    const buffer = await webResponse.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error("[Tantuve SSR]", error);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body><h1>Internal Server Error</h1><p>${error?.message || "Unknown error"}</p></body></html>`);
  }
}
