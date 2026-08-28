-- ============================================================
-- Tantuve — Full Database Schema
-- Run this in Supabase SQL Editor to set up / reset the database
-- ============================================================

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email) WHERE email IS NOT NULL;

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- GI Registry (craft types)
CREATE TABLE IF NOT EXISTS gi_registry (
  craft_type TEXT PRIMARY KEY,
  region TEXT NOT NULL DEFAULT '',
  official_description TEXT DEFAULT '',
  custom_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weavers
CREATE TABLE IF NOT EXISTS weavers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  craft_type TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  gi_registered BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  weaver_id UUID REFERENCES weavers(id),
  retailer_id UUID,
  title TEXT NOT NULL DEFAULT '',
  craft_type TEXT NOT NULL DEFAULT '',
  yarn_source TEXT,
  lot_id TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'in_progress',
  price NUMERIC,
  listed BOOLEAN DEFAULT false,

  -- Completion & IPFS
  completed_at TIMESTAMPTZ,
  ipfs_cid TEXT,
  pinned_content_backup JSONB,

  -- Trust levels
  trust_level INT DEFAULT 1,
  trust_signed_by TEXT,
  trust_signed_at TIMESTAMPTZ,

  -- Spot checks
  spot_check_selected BOOLEAN DEFAULT false,
  spot_check_status TEXT,

  -- Split products
  parent_product_id TEXT,
  split_into INT,

  -- First-scan-wins
  first_scan_claimed_at TIMESTAMPTZ,
  first_scan_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_data JSONB DEFAULT '{}'::jsonb,
  actor TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  entry_hash TEXT NOT NULL,
  previous_entry_hash TEXT,

  -- Photo evidence
  photo_ipfs_cid TEXT,

  -- Image verification
  image_verified BOOLEAN DEFAULT false,
  image_verified_at TIMESTAMPTZ,
  image_verification_result JSONB,

  -- Plausibility flagging
  flagged_plausibility BOOLEAN DEFAULT false,
  flagged_reason TEXT,

  UNIQUE(product_id, seq)
);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  viewer_role TEXT
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  reporter_contact TEXT,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retailers
CREATE TABLE IF NOT EXISTS retailers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  business_name TEXT,
  location TEXT DEFAULT '',
  contact_email TEXT,
  request_status TEXT DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retailer inventory
CREATE TABLE IF NOT EXISTS retailer_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  price NUMERIC,
  listed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_name TEXT,
  reviewer_ip TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Whitelist requests
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  identifier TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'weaver',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
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
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_weaver_id ON products(weaver_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_product_id ON ledger_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_seq ON ledger_entries(product_id, seq);
CREATE INDEX IF NOT EXISTS idx_scans_product_id ON scans(product_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_product_id ON disputes(product_id);
CREATE INDEX IF NOT EXISTS idx_weavers_user_id ON weavers(user_id);
CREATE INDEX IF NOT EXISTS idx_weavers_status ON weavers(status);
CREATE INDEX IF NOT EXISTS idx_retailers_user_id ON retailers(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Disable RLS for service role access (API routes use service role key)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE gi_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE weavers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE retailers DISABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- SEED: Default GI Registry entries
-- ==========================================
INSERT INTO gi_registry (craft_type, region, official_description) VALUES
  ('Patola', 'Gujarat', 'Double ikat Patola sarees from Patan, Gujarat. Registered under GI Act, 1999.'),
  ('Sambalpuri Bandha', 'Odisha', 'Traditional Sambalpuri bandha textiles with tie-dye ikat patterns from Odisha.'),
  ('Banarasi Silk', 'Uttar Pradesh', 'Banarasi silk brocade textiles from Varanasi, Uttar Pradesh.'),
  ('Kanjeevaram', 'Tamil Nadu', 'Kanjeevaram silk sarees with temple border motifs from Kanchipuram, Tamil Nadu.'),
  ('Ikat', 'Telangana', 'Pochampally ikat textiles with geometric resist-dyed patterns from Telangana.'),
  ('Chanderi', 'Madhya Pradesh', 'Chanderi sarees known for lightweight texture and sheer quality.'),
  ('Maheshwari', 'Madhya Pradesh', 'Maheshwari sarees with reversible borders and geometric designs.'),
  ('Muga Silk', 'Assam', 'Muga silk textiles — golden luster silk unique to Assam.'),
  ('Tussar Silk', 'Jharkhand', 'Tussar silk textiles from Jharkhand, known for natural gold color.')
ON CONFLICT (craft_type) DO NOTHING;
