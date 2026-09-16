-- ============================================================
-- LAMIDO CARS — SALES AGREEMENT & CHANGE OF OWNERSHIP SQL
-- ============================================================

-- 1. SALES_AGREEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.sales_agreements (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at            TIMESTAMPTZ DEFAULT now(),
    agreement_date        DATE DEFAULT CURRENT_DATE,
    
    -- Seller details
    seller_name           TEXT NOT NULL,
    seller_address        TEXT,
    seller_phone          TEXT,
    seller_id_type        TEXT,
    
    -- Buyer details
    buyer_name            TEXT NOT NULL,
    buyer_address         TEXT,
    buyer_phone           TEXT,
    buyer_id_type         TEXT,
    
    -- Vehicle details
    vehicle_make          TEXT NOT NULL,
    vehicle_year_model    TEXT,
    vehicle_color         TEXT,
    vehicle_engine_number TEXT,
    vehicle_chassis       TEXT,
    vehicle_plate_number  TEXT,
    
    -- Transaction details
    sale_price            TEXT,
    payment_method        TEXT,
    note                  TEXT,
    
    -- Signatures & Witnesses
    seller_signature      TEXT,
    buyer_signature       TEXT,
    seller_witness_name   TEXT,
    seller_witness_signature TEXT,
    buyer_witness_name    TEXT,
    buyer_witness_signature TEXT,
    rep_name              TEXT,
    rep_signature         TEXT,
    rep_signature_date    DATE DEFAULT CURRENT_DATE,
    
    -- Audit
    created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Safe column additions if table already exists
ALTER TABLE public.sales_agreements
    ADD COLUMN IF NOT EXISTS agreement_date        DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS seller_name           TEXT,
    ADD COLUMN IF NOT EXISTS seller_address        TEXT,
    ADD COLUMN IF NOT EXISTS seller_phone          TEXT,
    ADD COLUMN IF NOT EXISTS seller_id_type        TEXT,
    ADD COLUMN IF NOT EXISTS buyer_name            TEXT,
    ADD COLUMN IF NOT EXISTS buyer_address         TEXT,
    ADD COLUMN IF NOT EXISTS buyer_phone           TEXT,
    ADD COLUMN IF NOT EXISTS buyer_id_type         TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_make          TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_year_model    TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_color         TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_engine_number TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_chassis       TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_plate_number  TEXT,
    ADD COLUMN IF NOT EXISTS sale_price            TEXT,
    ADD COLUMN IF NOT EXISTS payment_method        TEXT,
    ADD COLUMN IF NOT EXISTS note                  TEXT,
    ADD COLUMN IF NOT EXISTS seller_signature      TEXT,
    ADD COLUMN IF NOT EXISTS buyer_signature       TEXT,
    ADD COLUMN IF NOT EXISTS seller_witness_name   TEXT,
    ADD COLUMN IF NOT EXISTS seller_witness_signature TEXT,
    ADD COLUMN IF NOT EXISTS buyer_witness_name    TEXT,
    ADD COLUMN IF NOT EXISTS buyer_witness_signature TEXT,
    ADD COLUMN IF NOT EXISTS rep_name              TEXT,
    ADD COLUMN IF NOT EXISTS rep_signature         TEXT,
    ADD COLUMN IF NOT EXISTS rep_signature_date    DATE,
    ADD COLUMN IF NOT EXISTS created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.sales_agreements ENABLE ROW LEVEL SECURITY;

-- Clean up old policies
DROP POLICY IF EXISTS "sales_agreements_select" ON public.sales_agreements;
DROP POLICY IF EXISTS "sales_agreements_insert" ON public.sales_agreements;
DROP POLICY IF EXISTS "sales_agreements_update" ON public.sales_agreements;
DROP POLICY IF EXISTS "sales_agreements_delete" ON public.sales_agreements;
DROP POLICY IF EXISTS "sales_agreements_anon_select" ON public.sales_agreements;

-- Policies for Authenticated staff
CREATE POLICY "sales_agreements_select" ON public.sales_agreements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "sales_agreements_insert" ON public.sales_agreements
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sales_agreements_update" ON public.sales_agreements
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sales_agreements_delete" ON public.sales_agreements
    FOR DELETE TO authenticated USING (true);

-- Anonymous read policy (for customer portal or preview links)
CREATE POLICY "sales_agreements_anon_select" ON public.sales_agreements
    FOR SELECT TO anon USING (true);

-- 3. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_agreements TO authenticated;
GRANT SELECT ON public.sales_agreements TO anon;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_sa_seller_name ON public.sales_agreements (seller_name);
CREATE INDEX IF NOT EXISTS idx_sa_buyer_name  ON public.sales_agreements (buyer_name);
CREATE INDEX IF NOT EXISTS idx_sa_vehicle_make ON public.sales_agreements (vehicle_make);
CREATE INDEX IF NOT EXISTS idx_sa_date         ON public.sales_agreements (agreement_date DESC);
CREATE INDEX IF NOT EXISTS idx_sa_created_at   ON public.sales_agreements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_chassis      ON public.sales_agreements (vehicle_chassis);

-- 5. REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'sales_agreements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_agreements;
  END IF;
END $$;
