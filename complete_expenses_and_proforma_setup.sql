-- ============================================================
-- LAMIDO CARS — PROFORMA QUOTES & COMPANY EXPENSES SETUP
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/vuxssslfeqbgozeconvd/sql/new
-- ============================================================

-- 1. HELPER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. PERFORMANCE_QUOTES TABLE (PROFORMA QUOTES)
CREATE TABLE IF NOT EXISTS public.performance_quotes (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  uuid        REFERENCES public.customers(id) ON DELETE SET NULL,
  total_amount numeric     NOT NULL DEFAULT 0,
  quote_date   date        NOT NULL DEFAULT CURRENT_DATE,
  status       text        NOT NULL DEFAULT 'Draft',
  notes        text,
  quote_url    text,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.performance_quotes
  ADD COLUMN IF NOT EXISTS customer_id  uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quote_date   date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS notes        text,
  ADD COLUMN IF NOT EXISTS quote_url    text,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- 3. PERFORMANCE_QUOTE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.performance_quote_items (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id            uuid        NOT NULL REFERENCES public.performance_quotes(id) ON DELETE CASCADE,
  vehicle_id          uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_description text,
  base_price          numeric     NOT NULL DEFAULT 0,
  has_duty            boolean     NOT NULL DEFAULT false,
  duty_price          numeric              DEFAULT 0,
  quantity            integer     NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.performance_quote_items
  ADD COLUMN IF NOT EXISTS vehicle_id          uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_description text,
  ADD COLUMN IF NOT EXISTS base_price          numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_duty            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duty_price          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity            integer NOT NULL DEFAULT 1;

-- 4. COMPANY EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title          text        NOT NULL,
  amount         numeric     NOT NULL DEFAULT 0,
  category       text        NOT NULL DEFAULT 'Errands & Logistics',
  errand_by      text,
  expense_date   date        NOT NULL DEFAULT CURRENT_DATE,
  payment_method text        NOT NULL DEFAULT 'Cash',
  notes          text,
  receipt_url    text,
  vehicle_id     uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS title          text,
  ADD COLUMN IF NOT EXISTS amount         numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category       text NOT NULL DEFAULT 'Errands & Logistics',
  ADD COLUMN IF NOT EXISTS errand_by      text,
  ADD COLUMN IF NOT EXISTS expense_date   date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS receipt_url    text,
  ADD COLUMN IF NOT EXISTS vehicle_id     uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- 5. TRIGGERS
DROP TRIGGER IF EXISTS update_performance_quotes_updated_at ON public.performance_quotes;
CREATE TRIGGER update_performance_quotes_updated_at
  BEFORE UPDATE ON public.performance_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ROW LEVEL SECURITY — PROFORMA QUOTES
ALTER TABLE public.performance_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "performance_quotes_select" ON public.performance_quotes;
DROP POLICY IF EXISTS "performance_quotes_insert" ON public.performance_quotes;
DROP POLICY IF EXISTS "performance_quotes_update" ON public.performance_quotes;
DROP POLICY IF EXISTS "performance_quotes_delete" ON public.performance_quotes;
DROP POLICY IF EXISTS "performance_quotes_anon_select" ON public.performance_quotes;

CREATE POLICY "performance_quotes_select" ON public.performance_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "performance_quotes_insert" ON public.performance_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "performance_quotes_update" ON public.performance_quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "performance_quotes_delete" ON public.performance_quotes FOR DELETE TO authenticated USING (true);
CREATE POLICY "performance_quotes_anon_select" ON public.performance_quotes FOR SELECT TO anon USING (true);

-- ROW LEVEL SECURITY — PROFORMA QUOTE ITEMS
ALTER TABLE public.performance_quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "performance_quote_items_select" ON public.performance_quote_items;
DROP POLICY IF EXISTS "performance_quote_items_insert" ON public.performance_quote_items;
DROP POLICY IF EXISTS "performance_quote_items_update" ON public.performance_quote_items;
DROP POLICY IF EXISTS "performance_quote_items_delete" ON public.performance_quote_items;
DROP POLICY IF EXISTS "performance_quote_items_anon_select" ON public.performance_quote_items;

CREATE POLICY "performance_quote_items_select" ON public.performance_quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "performance_quote_items_insert" ON public.performance_quote_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "performance_quote_items_update" ON public.performance_quote_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "performance_quote_items_delete" ON public.performance_quote_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "performance_quote_items_anon_select" ON public.performance_quote_items FOR SELECT TO anon USING (true);

-- ROW LEVEL SECURITY — EXPENSES
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses_anon_select" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (true);
CREATE POLICY "expenses_anon_select" ON public.expenses FOR SELECT TO anon USING (true);

-- 7. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_quotes TO authenticated;
GRANT SELECT ON public.performance_quotes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_quote_items TO authenticated;
GRANT SELECT ON public.performance_quote_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT ON public.expenses TO anon;

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_performance_quotes_customer ON public.performance_quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_performance_quotes_created  ON public.performance_quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote           ON public.performance_quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_vehicle         ON public.performance_quote_items (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_errand   ON public.expenses (errand_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created  ON public.expenses (created_at DESC);

-- 9. REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'performance_quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_quotes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;
