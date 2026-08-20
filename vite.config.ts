import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Inject select server-only env vars into the client bundle so the Supabase
// client (which runs in the browser) can reach the database.
// Only public-safe values are forwarded — service-role keys stay server-only.
function injectPublicEnv(): Record<string, string> {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
  ];
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = process.env[key];
    if (val) result[`import.meta.env.${key}`] = JSON.stringify(val);
  }
  return result;
}

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      server: {
        entry: "server",
      },
    }),
    tailwindcss(),
    react(),
  ],
  define: injectPublicEnv(),
});
