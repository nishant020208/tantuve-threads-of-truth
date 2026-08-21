-- Migration 005: Add email to profiles for auth lookup
-- Run this in Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Create unique index for email lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email) WHERE email IS NOT NULL;
