-- ============================================================
-- Tantuve — Fix Missing Tables and Columns
-- Run this in Supabase SQL Editor to bring DB in sync with API
-- ============================================================

-- ==========================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ==========================================

-- profiles: add email and password_hash
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email) WHERE email IS NOT NULL;

-- gi_registry: add custom_fields
ALTER TABLE gi_registry ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;

-- weavers: add updated_at
ALTER TABLE weavers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- retailers: add missing columns
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'pending';
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT now();

-- products: add all missing columns
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

-- ledger_entries: add photo and flagging columns
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS photo_ipfs_cid text;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verified_at timestamptz;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS image_verification_result jsonb;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_plausibility boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_reason text;

-- scans: add metadata columns
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS viewer_role text;

-- ==========================================
-- CREATE MISSING TABLES
-- ==========================================

-- Retailer inventory
CREATE TABLE IF NOT EXISTS retailer_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  price NUMERIC,
  listed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
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

-- Whitelist requests
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

-- Whitelist audit trail
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
