-- Migration: Add VAT fields to performance_quotes and condition/transmission/cylinders to performance_quote_items

ALTER TABLE public.performance_quotes
  ADD COLUMN IF NOT EXISTS vat_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;

ALTER TABLE public.performance_quote_items
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS cylinders text;
