-- Migration 002: Fraud-resistance and photo evidence columns
-- Run this in Supabase SQL editor before deploying the updated backend

-- ledger_entries: photo evidence + plausibility flags
ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS photo_ipfs_cid text,
  ADD COLUMN IF NOT EXISTS flagged_plausibility boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text;

-- products: spot-check selection
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS spot_check_selected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spot_check_status text DEFAULT NULL;
