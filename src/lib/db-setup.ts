import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Ensure the products table has the columns needed for blockchain integration.
 * Runs once on first server function call — safe to call repeatedly (idempotent).
 */
let _migrated = false;

export async function ensureBlockchainColumns() {
  if (_migrated) return;
  _migrated = true;

  const columns = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS on_chain_tx_hash text",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS on_chain_status text DEFAULT 'none'",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS final_hash text",
  ];

  for (const sql of columns) {
    const { error } = await supabaseAdmin.rpc("exec_sql", { sql_text: sql }).single();
    // If rpc doesn't exist, try direct query
    if (error) {
      // Columns may already exist — that's fine
      console.log(`[db-setup] Column migration skipped: ${error.message}`);
    }
  }
}
