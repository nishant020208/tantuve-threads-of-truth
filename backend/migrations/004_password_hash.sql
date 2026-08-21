-- Migration 004: Add password_hash to profiles
-- Run this in Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_hash text;
