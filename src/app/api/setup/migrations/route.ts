import { NextRequest, NextResponse } from "next/server";

const SQL = `
-- ledger_entries: photo verification + flagging
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS photo_ipfs_cid text;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified_at timestamptz;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verification_result jsonb;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_plausibility boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_reason text;

-- products: IPFS, trust, splitting, first-scan
ALTER TABLE products ADD COLUMN IF NOT EXISTS ipfs_cid text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_level int DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_signed_by text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trust_signed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pinned_content_backup jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS split_into int;
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_scan_claimed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_scan_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_selected boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_status text;

-- scans: metadata columns
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS viewer_role text;

-- gi_registry: custom fields
ALTER TABLE gi_registry ADD COLUMN IF NOT EXISTS custom_fields jsonb;

-- retailers: missing columns
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'pending';
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS contact_email text;

-- whitelist_requests table
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  identifier text NOT NULL,
  requested_role text NOT NULL,
  status text DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  applicant_name text,
  applicant_location text,
  applicant_craft text
);

-- whitelist_audit table
CREATE TABLE IF NOT EXISTS whitelist_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES whitelist_requests(id),
  action text NOT NULL,
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  notes text
);

-- reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  reviewer_name text,
  reviewer_ip text,
  submitted_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
`;

export async function GET() {
  return NextResponse.json({
    message: "Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor > New Query)",
    sql: SQL.trim(),
  });
}
