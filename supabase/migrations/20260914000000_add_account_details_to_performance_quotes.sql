-- ============================================================
-- Migration: Add account/bank details to performance_quotes
-- ============================================================

ALTER TABLE public.performance_quotes
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text;
