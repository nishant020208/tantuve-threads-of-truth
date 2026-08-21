#!/usr/bin/env node
/**
 * Generates .vercel/output/ (Build Output API v3).
 *
 * This is the most reliable way to deploy TanStack Start on Vercel.
 * It produces a deterministic build output that bypasses all auto-detection.
 *
 * Steps:
 *   1. Copy dist/client → .vercel/output/static
 *   2. Use esbuild to bundle api/index.js + dist/server/ into a single file
 *   3. Write that bundle as .vercel/output/functions/index.func/index.mjs
 *   4. Create .vc-config.json for the function
 *   5. Write .vercel/output/config.json with routing rules
 */
import { mkdirSync, cpSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = resolve(root, '.vercel', 'output');

console.log('[vercel-output] Generating .vercel/output ...');

// Clean
if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true });
}

// ── 1. Static assets ────────────────────────────────────────────────────────
const staticDir = resolve(outputDir, 'static');
mkdirSync(staticDir, { recursive: true });
cpSync(resolve(root, 'dist', 'client'), staticDir, { recursive: true });
console.log('[vercel-output] static ← dist/client');

// ── 2. Bundle the SSR function ──────────────────────────────────────────────
// We use esbuild to create a single self-contained file that includes
// the adapter (api/index.js) and the entire server tree (dist/server/).
// This eliminates all dynamic import issues at Vercel runtime.
const { build } = await import('esbuild');

const funcDir = resolve(outputDir, 'functions', 'index.func');
mkdirSync(funcDir, { recursive: true });

const bundledEntry = resolve(funcDir, '_entry.mjs');

await build({
  entryPoints: [resolve(root, 'api', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: bundledEntry,
  // Keep node_modules external — they're installed by Vercel
  packages: 'external',
  logLevel: 'info',
});

// Rename bundled entry to index.mjs (the function handler)
const { renameSync } = await import('node:fs');
renameSync(bundledEntry, resolve(funcDir, 'index.mjs'));

console.log('[vercel-output] functions/index.func/index.mjs ← bundled api/index.js + dist/server/');

// ── 3. Function config ──────────────────────────────────────────────────────
const vcConfig = {
  runtime: 'vercel/node@2',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  maxDuration: 30,
  includeFiles: ['**/*'],
};
writeFileSync(resolve(funcDir, '.vc-config.json'), JSON.stringify(vcConfig, null, 2));
console.log('[vercel-output] .vc-config.json written');

// ── 4. Build Output config.json ─────────────────────────────────────────────
const config = {
  version: 3,
  routes: [
    // Immutable asset caching
    {
      src: '/assets/(.*)',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    // Serve other static files first
    { handle: 'filesystem' },
    // Everything else → SSR function
    { src: '/(.*)', dest: '/index' },
  ],
};

writeFileSync(resolve(outputDir, 'config.json'), JSON.stringify(config, null, 2));
console.log('[vercel-output] config.json written');
console.log('[vercel-output] ✅ Done!');
