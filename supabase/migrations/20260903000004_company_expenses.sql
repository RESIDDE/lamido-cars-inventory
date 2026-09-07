-- ============================================================
-- LAMIDO CARS — COMPANY EXPENSES & ERRANDS SQL
-- Run in Supabase SQL Editor:
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

-- 2. EXPENSES TABLE
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

-- Safe column additions if table already exists
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

-- 3. TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses_anon_select" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "expenses_anon_select" ON public.expenses
  FOR SELECT TO anon USING (true);

-- 5. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT ON public.expenses TO anon;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_errand   ON public.expenses (errand_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created  ON public.expenses (created_at DESC);

-- 7. REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;
