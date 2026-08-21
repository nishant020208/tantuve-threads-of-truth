-- Migration 003: Whitelist access control
-- Run this in Supabase SQL editor

-- retailers: add whitelist columns
ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS request_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT now();

-- weavers: status column should already exist from prior migration
-- but ensure it defaults to 'pending' for new rows
ALTER TABLE weavers
  ALTER COLUMN status SET DEFAULT 'pending';
