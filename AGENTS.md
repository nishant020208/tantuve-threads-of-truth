# Tantuve — Threads of Truth

This is the Tantuve GI Handloom Traceability Platform.

## Project Structure

- **Framework**: Vite + TanStack Start + TanStack Router (SSR)
- **Database**: Supabase (client-side via `@supabase/supabase-js`)
- **UI**: Tailwind CSS v4, Radix UI, shadcn/ui components
- **Data**: TanStack Query for client-side data fetching

## Key Files

- `src/routes/` — File-based routing (TanStack Router)
- `src/components/` — Shared UI components
- `src/lib/` — Utilities, session, chain verification, i18n
- `src/integrations/supabase/` — Supabase client setup
- `src/assets/` — Static images
- `vite.config.ts` — Vite + TanStack Start configuration

## Build & Deploy

```bash
npm run dev    # Development server
npm run build  # Production build (Vercel-compatible)
npm run preview # Preview production build
```

## Design System

The saree palette is defined in `src/styles.css`:
- Primary: deep indigo (`--primary`)
- Accent: madder crimson (`--madder`)
- Highlight: turmeric gold (`--gold`)
- Support: sambalpuri teal (`--teal`)
- Background: handspun ivory (`--background`)
