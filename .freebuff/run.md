# Tantuve — Run Doc

## Local dev
```bash
npx vite dev --port 5173
```
Or detached:
```bash
node -e "const{spawn}=require('child_process'),fs=require('fs'),p=require('path');const l=fs.openSync('.freebuff/preview.log','a'),e=fs.openSync('.freebuff/preview.log.err','a');const c=spawn(p.resolve('node_modules/.bin/vite'),['dev','--port','5173'],{detached:true,stdio:['ignore',l,e],cwd:process.cwd(),shell:true});c.unref();console.log('PID='+c.pid)"
```

## Vercel deployment (Build Output API)

The Vercel deployment uses the **Build Output API** (`.vercel/output/`) to bypass Vercel's auto-detection errors entirely. This is the most reliable approach for TanStack Start.

### How it works
1. `npm run build` → `dist/client/` (static) + `dist/server/` (SSR bundle)
2. `node scripts/vercel-output.mjs` → generates `.vercel/output/`:
   - `static/` ← copies `dist/client/`
   - `functions/index.func/index.mjs` ← esbuild bundles `api/index.js` + entire `dist/server/` into a single 239KB file (no dynamic imports to resolve at runtime)
   - `functions/index.func/.vc-config.json` → `vercel/node@2` runtime
   - `config.json` → routing rules

### Critical files
- `vercel.json` — build command + outputDirectory pointing to `.vercel/output/static`
- `api/index.js` — Node.js adapter (converts req/res ↔ Web Request/Response)
- `scripts/vercel-output.mjs` — postbuild script that generates Build Output
- `package.json` — includes `esbuild` as devDependency

### Why this approach
- **No auto-detection errors**: Vercel reads `.vercel/output/config.json` instead of auto-detecting `api/index.js`
- **No dynamic import issues**: esbuild bundles everything into a single file at build time
- **No runtime version errors**: `.vc-config.json` specifies `vercel/node@2` explicitly

### Env vars to set in Vercel dashboard
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL` (same value as SUPABASE_URL)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (same value as SUPABASE_PUBLISHABLE_KEY)
- `CEREBRAS_API_KEY`
- `ALCHEMY_API_KEY`
- `PINATA_JWT`
- `PINATA_API_KEY`
- `PINATA_SECRET_API_KEY`
