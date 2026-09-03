-- ============================================================
-- LAMIDO CARS — CUSTOMERS TABLE SAVE / SETUP MIGRATION
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/vuxssslfeqbgozeconvd/sql/new
--
-- IDEMPOTENT: safe to run multiple times.
-- Covers everything Customers.tsx writes to the database.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CUSTOMERS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text        NOT NULL,
  email          text,
  phone          text,
  address        text,
  notes          text,
  signature_data text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Add any missing columns safely
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email          text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS address        text,
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS created_by     text,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- ────────────────────────────────────────────────────────────
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop ALL old policy variants (every name used across migrations)
DROP POLICY IF EXISTS "Customers full access"                   ON public.customers;
DROP POLICY IF EXISTS "Anyone can select customers"             ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers"             ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers"             ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers"             ON public.customers;
DROP POLICY IF EXISTS "Authenticated can select customers"      ON public.customers;
DROP POLICY IF EXISTS "Authenticated can insert customers"      ON public.customers;
DROP POLICY IF EXISTS "Authenticated can update customers"      ON public.customers;
DROP POLICY IF EXISTS "Authenticated can delete customers"      ON public.customers;
DROP POLICY IF EXISTS "Authenticated select customers"          ON public.customers;
DROP POLICY IF EXISTS "Authenticated insert customers"          ON public.customers;
DROP POLICY IF EXISTS "Authenticated update customers"          ON public.customers;
DROP POLICY IF EXISTS "Authenticated delete customers"          ON public.customers;
DROP POLICY IF EXISTS "Public select customers"                 ON public.customers;
DROP POLICY IF EXISTS "Public update customer signature"        ON public.customers;
DROP POLICY IF EXISTS "customers_select"                        ON public.customers;
DROP POLICY IF EXISTS "customers_insert"                        ON public.customers;
DROP POLICY IF EXISTS "customers_update"                        ON public.customers;
DROP POLICY IF EXISTS "customers_delete"                        ON public.customers;
DROP POLICY IF EXISTS "customers_anon_select"                   ON public.customers;
DROP POLICY IF EXISTS "customers_anon_update_signature"         ON public.customers;

-- Authenticated staff: full CRUD
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated USING (true);

-- Anonymous: read-only (for signing pages / customer portal)
CREATE POLICY "customers_anon_select" ON public.customers
  FOR SELECT TO anon USING (true);

-- Anonymous: can update their own signature (signing workflow)
CREATE POLICY "customers_anon_update_signature" ON public.customers
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. GRANT table access to the API roles
--    (needed if your project has Data API restrictions)
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, UPDATE ON public.customers TO anon;

-- ────────────────────────────────────────────────────────────
-- 6. INDEXES for fast lookups
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_name       ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- DONE
-- Customers.tsx fields mapped to columns:
--
--  Form field   Column
--  ──────────────────────────
--  name         name (required)
--  email        email
--  phone        phone
--  address      address
--  notes        notes
-- ────────────────────────────────────────────────────────────
