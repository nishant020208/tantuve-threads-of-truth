import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

/**
 * One-time setup endpoint — creates missing tables and columns.
 * Call POST /api/setup/execute-sql once, then delete or disable.
 */

const SQL = `
-- 1. Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email) WHERE email IS NOT NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add custom_fields to gi_registry
ALTER TABLE gi_registry ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;

-- 3. Add updated_at to weavers
ALTER TABLE weavers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Add missing columns to retailers
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'pending';
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT now();

-- 5. Add missing columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ipfs_cid text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pinned_content_backup jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_level int DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_signed_by text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_signed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_selected boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_status text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS split_into int;
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_scan_claimed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_scan_id text;

-- 6. Add missing columns to ledger_entries
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS photo_ipfs_cid text;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified_at timestamptz;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verification_result jsonb;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_plausibility boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_reason text;

-- 7. Add missing columns to scans
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS viewer_role text;

-- 8. Create missing tables
CREATE TABLE IF NOT EXISTS retailer_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  price NUMERIC,
  listed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_name TEXT,
  reviewer_ip TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

CREATE TABLE IF NOT EXISTS whitelist_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  identifier TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'weaver',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  applicant_name TEXT,
  applicant_location TEXT,
  applicant_craft TEXT,
  applicant_bio TEXT
);

CREATE TABLE IF NOT EXISTS whitelist_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES whitelist_requests(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  role TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);
`;

export async function POST(req: NextRequest) {
  try {
    const client = getServerClient();
    const results: string[] = [];

    // Split SQL into individual statements and execute one by one
    const statements = SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        // Use Supabase's RPC to execute raw SQL
        // First try to create the exec_sql function if it doesn't exist
        const { error } = await client.rpc("exec_sql" as any, { sql: stmt + ";" });
        if (error) {
          // If exec_sql doesn't exist, try direct query via raw SQL
          // Supabase JS client doesn't support raw SQL, so we log the statement
          results.push(`PENDING: ${stmt.substring(0, 80)}...`);
        } else {
          results.push(`OK: ${stmt.substring(0, 80)}...`);
        }
      } catch (err: any) {
        results.push(`ERROR: ${err.message?.substring(0, 80)}`);
      }
    }

    // Check which tables now exist
    const tableChecks: Record<string, boolean> = {};
    for (const table of ["retailer_inventory", "reviews", "whitelist_requests", "whitelist_audit"]) {
      try {
        const { error } = await client.from(table).select("*").limit(1);
        tableChecks[table] = !error;
      } catch {
        tableChecks[table] = false;
      }
    }

    // Check key columns
    const columnChecks: Record<string, boolean> = {};
    const keyColumns: Record<string, string[]> = {
      products: ["ipfs_cid", "completed_at", "trust_level", "spot_check_selected"],
      ledger_entries: ["photo_ipfs_cid", "flagged_plausibility", "image_verified"],
      scans: ["ip_address", "user_agent"],
      profiles: ["email", "password_hash"],
      retailers: ["business_name", "request_status"],
    };

    for (const [table, cols] of Object.entries(keyColumns)) {
      try {
        const { data } = await client.from(table).select("*").limit(1);
        if (data && data.length > 0) {
          const existingCols = Object.keys(data[0]);
          for (const col of cols) {
            columnChecks[`${table}.${col}`] = existingCols.includes(col);
          }
        }
      } catch {
        for (const col of cols) {
          columnChecks[`${table}.${col}`] = false;
        }
      }
    }

    return NextResponse.json({
      message: "Setup check complete",
      tables: tableChecks,
      columns: columnChecks,
      note: "If tables or columns show false, run the SQL manually in Supabase Dashboard → SQL Editor",
      sql: SQL.trim(),
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

// GET returns the SQL for manual execution
export async function GET() {
  return NextResponse.json({
    message: "Run this SQL in Supabase Dashboard → SQL Editor → New Query",
    url: `https://supabase.com/dashboard/project/bhqxeoergjdndkahrmic/sql/new`,
    sql: SQL.trim(),
  });
}
