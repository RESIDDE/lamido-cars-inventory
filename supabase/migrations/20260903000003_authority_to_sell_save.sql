-- ============================================================
-- LAMIDO CARS — AUTHORITY TO SELL (ATS) SQL
-- Paste into: https://supabase.com/dashboard/project/vuxssslfeqbgozeconvd/sql/new
-- ============================================================

-- 1. AUTHORITY_TO_SELL TABLE
CREATE TABLE IF NOT EXISTS public.authority_to_sell (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at            TIMESTAMPTZ DEFAULT now(),
    agreement_date        DATE DEFAULT CURRENT_DATE,
    
    -- Owner details
    customer_name         TEXT NOT NULL,
    customer_address      TEXT,
    customer_phone        TEXT,
    customer_id_type      TEXT,
    
    -- Vehicle details
    vehicle_make          TEXT NOT NULL,
    vehicle_year_model    TEXT,
    vehicle_color         TEXT,
    vehicle_engine_number TEXT,
    vehicle_chassis       TEXT,
    
    -- Authority terms
    valid_until           DATE,
    note                  TEXT,
    
    -- Customer signature
    signature             TEXT,
    
    -- Representative fields
    rep_name              TEXT,
    owner_rep_name        TEXT,
    rep_signature         TEXT,
    rep_signature_date    DATE DEFAULT CURRENT_DATE,
    
    -- Audit
    created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Safe column additions if table already existed previously
ALTER TABLE public.authority_to_sell
    ADD COLUMN IF NOT EXISTS agreement_date        DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS customer_name         TEXT,
    ADD COLUMN IF NOT EXISTS customer_address      TEXT,
    ADD COLUMN IF NOT EXISTS customer_phone        TEXT,
    ADD COLUMN IF NOT EXISTS customer_id_type      TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_make          TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_year_model    TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_color         TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_engine_number TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_chassis       TEXT,
    ADD COLUMN IF NOT EXISTS valid_until           DATE,
    ADD COLUMN IF NOT EXISTS note                  TEXT,
    ADD COLUMN IF NOT EXISTS signature             TEXT,
    ADD COLUMN IF NOT EXISTS rep_name              TEXT,
    ADD COLUMN IF NOT EXISTS owner_rep_name        TEXT,
    ADD COLUMN IF NOT EXISTS rep_signature         TEXT,
    ADD COLUMN IF NOT EXISTS rep_signature_date    DATE,
    ADD COLUMN IF NOT EXISTS created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.authority_to_sell ENABLE ROW LEVEL SECURITY;

-- Clean up old policies
DROP POLICY IF EXISTS "ATS full access" ON public.authority_to_sell;
DROP POLICY IF EXISTS "Authenticated users can manage ATS" ON public.authority_to_sell;
DROP POLICY IF EXISTS "authority_to_sell_select" ON public.authority_to_sell;
DROP POLICY IF EXISTS "authority_to_sell_insert" ON public.authority_to_sell;
DROP POLICY IF EXISTS "authority_to_sell_update" ON public.authority_to_sell;
DROP POLICY IF EXISTS "authority_to_sell_delete" ON public.authority_to_sell;
DROP POLICY IF EXISTS "authority_to_sell_anon_select" ON public.authority_to_sell;

-- Policies for Authenticated staff
CREATE POLICY "authority_to_sell_select" ON public.authority_to_sell
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authority_to_sell_insert" ON public.authority_to_sell
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authority_to_sell_update" ON public.authority_to_sell
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authority_to_sell_delete" ON public.authority_to_sell
    FOR DELETE TO authenticated USING (true);

-- Anonymous read policy (for customer portal or preview links)
CREATE POLICY "authority_to_sell_anon_select" ON public.authority_to_sell
    FOR SELECT TO anon USING (true);

-- 3. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authority_to_sell TO authenticated;
GRANT SELECT ON public.authority_to_sell TO anon;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_ats_customer_name ON public.authority_to_sell (customer_name);
CREATE INDEX IF NOT EXISTS idx_ats_vehicle_make  ON public.authority_to_sell (vehicle_make);
CREATE INDEX IF NOT EXISTS idx_ats_date          ON public.authority_to_sell (agreement_date DESC);
CREATE INDEX IF NOT EXISTS idx_ats_created_at    ON public.authority_to_sell (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_chassis       ON public.authority_to_sell (vehicle_chassis);

-- 5. REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'authority_to_sell'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.authority_to_sell;
  END IF;
END $$;
