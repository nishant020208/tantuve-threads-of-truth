-- Add missing columns to align schema with API routes

-- Products: add columns for completion tracking and spot checks
ALTER TABLE products ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ipfs_cid text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_selected boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS spot_check_status text;

-- Retailers: add whitelist columns
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'approved';
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- Ledger entries: add photo and flagging columns
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS photo_ipfs_cid text;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_plausibility boolean DEFAULT false;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS flagged_reason text;

-- Retailer inventory table
CREATE TABLE IF NOT EXISTS retailer_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text REFERENCES products(id),
  retailer_id uuid REFERENCES retailers(id),
  received_at timestamptz DEFAULT now(),
  price numeric,
  listed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Set all existing retailers to approved
UPDATE retailers SET request_status = 'approved' WHERE request_status IS NULL;
