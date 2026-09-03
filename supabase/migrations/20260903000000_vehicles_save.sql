-- ============================================================
-- LAMIDO CARS — VEHICLES SAVE / SETUP MIGRATION
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/_/sql/new
--
-- This migration is IDEMPOTENT (safe to run multiple times).
-- It creates / ensures the vehicles table and every column
-- that VehicleForm.tsx writes, plus vehicle_images, storage
-- bucket, RLS policies, and Realtime.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. HELPER: update_updated_at_column() trigger function
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 1. VEHICLES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core identity
  make                  text        NOT NULL,
  model                 text        NOT NULL,
  year                  integer     NOT NULL,
  vin                   text        UNIQUE,
  trim                  text,
  color                 text,

  -- Specs
  mileage               numeric,
  fuel_type             text,
  transmission          text,

  -- Pricing
  price                 numeric     NOT NULL DEFAULT 0,
  cost_price            numeric              DEFAULT 0,

  -- Status / condition
  status                text        NOT NULL DEFAULT 'Available',   -- Available | Sold | Reserved
  condition             text        NOT NULL DEFAULT 'Used',        -- New | Used | Damaged
  inventory_type        text        NOT NULL DEFAULT 'Lamido',      -- Lamido | resale

  -- Inventory logistics
  num_keys              integer     NOT NULL DEFAULT 0,
  date_arrived          date,
  date_stored           date,
  description           text,
  image_url             text,       -- legacy single-image field (kept for compatibility)

  -- Source / supplier info (Lamido inventory)
  source_company        text,
  source_company_phone  text,

  -- Representative who delivered the vehicle
  source_rep_name       text,
  source_rep_phone      text,
  source_rep_signature  text,       -- Base64 / data-URL of signature

  -- Acceptance / receiving details (staff side)
  accepted_by_name      text,
  accepted_by_phone     text,
  accepted_date         date,
  accepted_signature    text,       -- Base64 / data-URL of staff signature

  -- Audit
  created_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Add any columns that may be missing (safe ALTER TABLE)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS trim                  text,
  ADD COLUMN IF NOT EXISTS inventory_type        text        NOT NULL DEFAULT 'Lamido',
  ADD COLUMN IF NOT EXISTS num_keys              integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condition             text        NOT NULL DEFAULT 'Used',
  ADD COLUMN IF NOT EXISTS date_arrived          date,
  ADD COLUMN IF NOT EXISTS date_stored           date,
  ADD COLUMN IF NOT EXISTS source_company        text,
  ADD COLUMN IF NOT EXISTS source_company_phone  text,
  ADD COLUMN IF NOT EXISTS source_rep_name       text,
  ADD COLUMN IF NOT EXISTS source_rep_phone      text,
  ADD COLUMN IF NOT EXISTS source_rep_signature  text,
  ADD COLUMN IF NOT EXISTS accepted_by_name      text,
  ADD COLUMN IF NOT EXISTS accepted_by_phone     text,
  ADD COLUMN IF NOT EXISTS accepted_date         date,
  ADD COLUMN IF NOT EXISTS accepted_signature    text,
  ADD COLUMN IF NOT EXISTS cost_price            numeric     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by            text;

-- ────────────────────────────────────────────────────────────
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 4. VEHICLE IMAGES TABLE (multi-image support)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id  uuid        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY — VEHICLES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Drop old policies (any naming variant that may have been used)
DROP POLICY IF EXISTS "Vehicles full access"               ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can select vehicles"         ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can insert vehicles"         ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can update vehicles"         ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can delete vehicles"         ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can select vehicles"  ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can insert vehicles"  ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can update vehicles"  ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can delete vehicles"  ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated select vehicles"      ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated insert vehicles"      ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated update vehicles"      ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated delete vehicles"      ON public.vehicles;
DROP POLICY IF EXISTS "Public select vehicles"             ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select"                    ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert"                    ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update"                    ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete"                    ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_anon_select"               ON public.vehicles;

-- Authenticated staff: full CRUD
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated USING (true);

-- Anonymous (signing pages, customer portal): read-only
CREATE POLICY "vehicles_anon_select" ON public.vehicles
  FOR SELECT TO anon USING (true);

-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — VEHICLE_IMAGES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle images access"                   ON public.vehicle_images;
DROP POLICY IF EXISTS "Anyone can select vehicle_images"        ON public.vehicle_images;
DROP POLICY IF EXISTS "Anyone can insert vehicle_images"        ON public.vehicle_images;
DROP POLICY IF EXISTS "Anyone can delete vehicle_images"        ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated select vehicle_images"     ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated insert vehicle_images"     ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated update vehicle_images"     ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated delete vehicle_images"     ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated users can view vehicle images"   ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated users can insert vehicle images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle images" ON public.vehicle_images;
DROP POLICY IF EXISTS "vehicle_images_select"                   ON public.vehicle_images;
DROP POLICY IF EXISTS "vehicle_images_insert"                   ON public.vehicle_images;
DROP POLICY IF EXISTS "vehicle_images_update"                   ON public.vehicle_images;
DROP POLICY IF EXISTS "vehicle_images_delete"                   ON public.vehicle_images;

CREATE POLICY "vehicle_images_select" ON public.vehicle_images
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "vehicle_images_insert" ON public.vehicle_images
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "vehicle_images_update" ON public.vehicle_images
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "vehicle_images_delete" ON public.vehicle_images
  FOR DELETE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKET — vehicle-images
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old storage policies
DROP POLICY IF EXISTS "Authenticated users can upload vehicle images"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle images"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle images"  ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle images"                 ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload vehicle images"               ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update vehicle images"               ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete vehicle images"               ON storage.objects;
DROP POLICY IF EXISTS "Storage vehicle images"                         ON storage.objects;
DROP POLICY IF EXISTS "storage_vehicle_images_select"                  ON storage.objects;
DROP POLICY IF EXISTS "storage_vehicle_images_insert"                  ON storage.objects;
DROP POLICY IF EXISTS "storage_vehicle_images_update"                  ON storage.objects;
DROP POLICY IF EXISTS "storage_vehicle_images_delete"                  ON storage.objects;

-- Consolidated storage policies
CREATE POLICY "storage_vehicle_images_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "storage_vehicle_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "storage_vehicle_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "storage_vehicle_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images');

-- ────────────────────────────────────────────────────────────
-- 8. INDEXES for fast lookups
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_status         ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_inventory_type ON public.vehicles (inventory_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model     ON public.vehicles (make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at     ON public.vehicles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle  ON public.vehicle_images (vehicle_id);

-- ────────────────────────────────────────────────────────────
-- 9. REALTIME (lets the UI receive live updates)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- VehicleForm.tsx field → column mapping:
--
--  Form field              Column
--  ─────────────────────────────────────────────
--  make                   make
--  model                  model
--  year                   year (integer)
--  vin                    vin (unique)
--  trim                   trim
--  color                  color
--  mileage                mileage
--  fuel_type              fuel_type
--  transmission           transmission
--  price                  price
--  cost_price             cost_price
--  status                 status
--  condition              condition
--  inventory_type         inventory_type
--  date_arrived           date_arrived
--  date_stored            date_stored
--  num_keys               num_keys (integer)
--  description            description
--  source_company         source_company
--  source_company_phone   source_company_phone
--  source_rep_name        source_rep_name
--  source_rep_phone       source_rep_phone
--  source_rep_signature   source_rep_signature (Base64)
--  accepted_by_name       accepted_by_name
--  accepted_by_phone      accepted_by_phone
--  accepted_date          accepted_date
--  accepted_signature     accepted_signature (Base64)
--  images (File[])        vehicle_images table + storage bucket
-- ────────────────────────────────────────────────────────────
