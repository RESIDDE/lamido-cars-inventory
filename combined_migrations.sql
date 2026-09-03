-- ============================================================
-- FILE: 20240417_add_job_card_fields.sql
-- ============================================================
-- Overhaul Repairs table for Job Card requirements
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS job_card_no TEXT,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS service_supervisor TEXT,
ADD COLUMN IF NOT EXISTS technician_assigned TEXT,
ADD COLUMN IF NOT EXISTS registration_no TEXT,
ADD COLUMN IF NOT EXISTS vin_chassis TEXT,
ADD COLUMN IF NOT EXISTS mileage TEXT,
ADD COLUMN IF NOT EXISTS fuel_level TEXT,
ADD COLUMN IF NOT EXISTS condition_check JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_complaint TEXT,
ADD COLUMN IF NOT EXISTS painting_bodywork JSONB DEFAULT '{"items": [], "details": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS mechanical_service JSONB DEFAULT '{"items": [], "details": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS parts_to_replace TEXT,
ADD COLUMN IF NOT EXISTS parts_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS labour_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_charges NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_out DATE,
ADD COLUMN IF NOT EXISTS checked_by TEXT;

-- Update RLS if needed (re-applying standard project policies)
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.repairs;
CREATE POLICY "Enable all access for authenticated users" ON public.repairs 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- FILE: 20260408185652_0afb4e8a-7ff5-49cb-af81-fa47e812a139.sql
-- ============================================================

-- Add missing columns to vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS date_arrived date,
  ADD COLUMN IF NOT EXISTS date_stored date,
  ADD COLUMN IF NOT EXISTS num_keys integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_company text,
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'Used';

-- Add unique constraint on VIN
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_vin_unique UNIQUE (vin);

-- Create vehicle_images table
CREATE TABLE public.vehicle_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle images"
  ON public.vehicle_images FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicle images"
  ON public.vehicle_images FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicle images"
  ON public.vehicle_images FOR DELETE
  TO authenticated USING (true);

-- Create storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-images', 'vehicle-images', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can update vehicle images"
  ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can delete vehicle images"
  ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'vehicle-images');


-- ============================================================
-- FILE: 20260408191618_56912b6e-27eb-4abc-a394-9fe6423868e0.sql
-- ============================================================

-- Drop existing policies and recreate for anon + authenticated

-- VEHICLES
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

CREATE POLICY "Anyone can select vehicles" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert vehicles" ON public.vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update vehicles" ON public.vehicles FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete vehicles" ON public.vehicles FOR DELETE TO anon, authenticated USING (true);

-- VEHICLE_IMAGES
DROP POLICY IF EXISTS "Authenticated users can delete vehicle images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated users can insert vehicle images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated users can view vehicle images" ON public.vehicle_images;

CREATE POLICY "Anyone can select vehicle_images" ON public.vehicle_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert vehicle_images" ON public.vehicle_images FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete vehicle_images" ON public.vehicle_images FOR DELETE TO anon, authenticated USING (true);

-- CUSTOMERS
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

CREATE POLICY "Anyone can select customers" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete customers" ON public.customers FOR DELETE TO anon, authenticated USING (true);

-- SALES
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;

CREATE POLICY "Anyone can select sales" ON public.sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert sales" ON public.sales FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update sales" ON public.sales FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete sales" ON public.sales FOR DELETE TO anon, authenticated USING (true);

-- INQUIRIES
DROP POLICY IF EXISTS "Authenticated users can delete inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated users can insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated users can update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated users can view inquiries" ON public.inquiries;

CREATE POLICY "Anyone can select inquiries" ON public.inquiries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update inquiries" ON public.inquiries FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete inquiries" ON public.inquiries FOR DELETE TO anon, authenticated USING (true);

-- STORAGE: allow anon uploads to vehicle-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle images" ON storage.objects;

CREATE POLICY "Anyone can view vehicle images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'vehicle-images');
CREATE POLICY "Anyone can upload vehicle images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'vehicle-images');
CREATE POLICY "Anyone can update vehicle images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'vehicle-images');
CREATE POLICY "Anyone can delete vehicle images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'vehicle-images');


-- ============================================================
-- FILE: 20260408195003_d072764a-dfe3-485d-8be5-eda56eee16b5.sql
-- ============================================================

CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  condition_at_pickup TEXT NOT NULL,
  pickup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_data TEXT,
  returned_in_good_condition BOOLEAN NOT NULL DEFAULT false,
  return_condition_notes TEXT,
  return_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select inspections" ON public.inspections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert inspections" ON public.inspections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update inspections" ON public.inspections FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete inspections" ON public.inspections FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- FILE: 20260409065058_b892fded-7168-47d9-a598-507c0f4df6df.sql
-- ============================================================

CREATE TABLE public.repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  model_year INTEGER,
  unit TEXT,
  condition TEXT,
  company TEXT,
  replacement_parts TEXT,
  damaged_parts TEXT,
  to_be_resprayed BOOLEAN NOT NULL DEFAULT false,
  repair_cost NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'deposit',
  payment_type TEXT DEFAULT 'cash',
  brought_in_by TEXT,
  handed_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select repairs" ON public.repairs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert repairs" ON public.repairs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update repairs" ON public.repairs FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete repairs" ON public.repairs FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- FILE: 20260409072448_e77b91a2-98b8-4919-8839-f7710e2df668.sql
-- ============================================================
ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_data text;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS signature_data text;


-- ============================================================
-- FILE: 20260410045930_6e4126cf-86ad-49db-b45d-63f84c9d8622.sql
-- ============================================================

-- Add missing columns to repairs for invoice linking
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS manual_make text;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS manual_model text;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS manual_year text;

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  sale_id uuid REFERENCES public.sales(id),
  invoice_type text NOT NULL DEFAULT 'sale',
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create invoice_repairs junction table
CREATE TABLE public.invoice_repairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, repair_id)
);

ALTER TABLE public.invoice_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select invoice_repairs" ON public.invoice_repairs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert invoice_repairs" ON public.invoice_repairs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete invoice_repairs" ON public.invoice_repairs FOR DELETE TO anon, authenticated USING (true);


-- ============================================================
-- FILE: 20260412000000_auth_roles_rls.sql
-- ============================================================
-- 1. Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'mechanic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role app_role not null default 'mechanic'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- 3. Create has_role() function
CREATE OR REPLACE FUNCTION public.has_role(checking_role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = checking_role
  );
$$;

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and edit all roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role('admin'));

-- 4. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  phone text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_user boolean;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');

  -- Insert role (temporarily make everyone admin as requested)
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 6. Tighten RLS on all tables
-- VEHICLES
DROP POLICY IF EXISTS "Anyone can select vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can delete vehicles" ON public.vehicles;

CREATE POLICY "Authenticated can select vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- CUSTOMERS
DROP POLICY IF EXISTS "Anyone can select customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;

CREATE POLICY "Authenticated can select customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

-- SALES
DROP POLICY IF EXISTS "Anyone can select sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can delete sales" ON public.sales;

CREATE POLICY "Authenticated can select sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- INQUIRIES
DROP POLICY IF EXISTS "Anyone can select inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Anyone can update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Anyone can delete inquiries" ON public.inquiries;

CREATE POLICY "Authenticated can select inquiries" ON public.inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inquiries" ON public.inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING (true);

-- REPAIRS
DROP POLICY IF EXISTS "Anyone can select repairs" ON public.repairs;
DROP POLICY IF EXISTS "Anyone can insert repairs" ON public.repairs;
DROP POLICY IF EXISTS "Anyone can update repairs" ON public.repairs;
DROP POLICY IF EXISTS "Anyone can delete repairs" ON public.repairs;

CREATE POLICY "Authenticated can select repairs" ON public.repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert repairs" ON public.repairs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update repairs" ON public.repairs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete repairs" ON public.repairs FOR DELETE TO authenticated USING (true);

-- INVOICES
DROP POLICY IF EXISTS "Anyone can select invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can delete invoices" ON public.invoices;

CREATE POLICY "Authenticated can select invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (true);

-- INVOICE_REPAIRS
DROP POLICY IF EXISTS "Anyone can select invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Anyone can insert invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Anyone can update invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Anyone can delete invoice_repairs" ON public.invoice_repairs;

CREATE POLICY "Authenticated can select invoice_repairs" ON public.invoice_repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert invoice_repairs" ON public.invoice_repairs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoice_repairs" ON public.invoice_repairs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete invoice_repairs" ON public.invoice_repairs FOR DELETE TO authenticated USING (true);

-- INSPECTIONS
DROP POLICY IF EXISTS "Anyone can select inspections" ON public.inspections;
DROP POLICY IF EXISTS "Anyone can insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Anyone can update inspections" ON public.inspections;
DROP POLICY IF EXISTS "Anyone can delete inspections" ON public.inspections;

CREATE POLICY "Authenticated can select inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inspections" ON public.inspections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete inspections" ON public.inspections FOR DELETE TO authenticated USING (true);

-- 7. Public Lookup Function for Customer Portal
CREATE OR REPLACE FUNCTION public.get_customer_portal_data(lookup_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cust_record record;
  repairs_data json;
  invoices_data json;
BEGIN
  -- 1. Find customer by phone
  SELECT id, name, phone INTO cust_record FROM public.customers WHERE phone = lookup_phone LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Get repairs
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', r.id,
      'condition', r.condition,
      'unit', r.unit,
      'repair_cost', r.repair_cost,
      'payment_status', r.payment_status,
      'created_at', r.created_at,
      'vehicle', json_build_object('make', v.make, 'model', v.model, 'year', v.year),
      'manual_make', r.manual_make,
      'manual_model', r.manual_model
    )
  ), '[]'::json) INTO repairs_data
  FROM public.repairs r
  LEFT JOIN public.vehicles v ON v.id = r.vehicle_id
  WHERE r.customer_id = cust_record.id;

  -- 3. Get invoices
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', i.id,
      'invoice_number', i.invoice_number,
      'total_amount', i.total_amount,
      'amount_paid', i.amount_paid,
      'status', i.status,
      'created_at', i.created_at,
      'type', i.type
    )
  ), '[]'::json) INTO invoices_data
  FROM public.invoices i
  WHERE i.customer_id = cust_record.id;

  RETURN json_build_object(
    'customer', json_build_object('id', cust_record.id, 'name', cust_record.name, 'phone', cust_record.phone),
    'repairs', repairs_data,
    'invoices', invoices_data
  );
END;
$$;


-- ============================================================
-- FILE: 20260413203434_8ef77686-8615-4f63-9e8e-d10cdee840bf.sql
-- ============================================================

-- Step 1: Fix handle_new_user to assign admin only to the first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'mechanic');
  END IF;

  RETURN NEW;
END;
$$;

-- Step 2: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Tighten RLS - vehicles
DROP POLICY IF EXISTS "Public select vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated select vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated delete vehicles" ON public.vehicles;
CREATE POLICY "Authenticated select vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "Public select customers" ON public.customers;
DROP POLICY IF EXISTS "Public insert customers" ON public.customers;
DROP POLICY IF EXISTS "Public update customers" ON public.customers;
DROP POLICY IF EXISTS "Public delete customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated select customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated delete customers" ON public.customers;
CREATE POLICY "Authenticated select customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

-- sales
DROP POLICY IF EXISTS "Public select sales" ON public.sales;
DROP POLICY IF EXISTS "Public insert sales" ON public.sales;
DROP POLICY IF EXISTS "Public update sales" ON public.sales;
DROP POLICY IF EXISTS "Public delete sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated select sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated delete sales" ON public.sales;
CREATE POLICY "Authenticated select sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- repairs
DROP POLICY IF EXISTS "Public select repairs" ON public.repairs;
DROP POLICY IF EXISTS "Public insert repairs" ON public.repairs;
DROP POLICY IF EXISTS "Public update repairs" ON public.repairs;
DROP POLICY IF EXISTS "Public delete repairs" ON public.repairs;
DROP POLICY IF EXISTS "Authenticated select repairs" ON public.repairs;
DROP POLICY IF EXISTS "Authenticated insert repairs" ON public.repairs;
DROP POLICY IF EXISTS "Authenticated update repairs" ON public.repairs;
DROP POLICY IF EXISTS "Authenticated delete repairs" ON public.repairs;
CREATE POLICY "Authenticated select repairs" ON public.repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert repairs" ON public.repairs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update repairs" ON public.repairs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete repairs" ON public.repairs FOR DELETE TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "Public select invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated select invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated delete invoices" ON public.invoices;
CREATE POLICY "Authenticated select invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete invoices" ON public.invoices FOR DELETE TO authenticated USING (true);

-- inspections
DROP POLICY IF EXISTS "Public select inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public update inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public delete inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated select inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated update inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated delete inspections" ON public.inspections;
CREATE POLICY "Authenticated select inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update inspections" ON public.inspections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete inspections" ON public.inspections FOR DELETE TO authenticated USING (true);

-- inquiries
DROP POLICY IF EXISTS "Public select inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Public insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Public update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Public delete inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated select inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authenticated delete inquiries" ON public.inquiries;
CREATE POLICY "Authenticated select inquiries" ON public.inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert inquiries" ON public.inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING (true);

-- vehicle_images
DROP POLICY IF EXISTS "Public select vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Public insert vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Public update vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Public delete vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated select vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated insert vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated update vehicle_images" ON public.vehicle_images;
DROP POLICY IF EXISTS "Authenticated delete vehicle_images" ON public.vehicle_images;
CREATE POLICY "Authenticated select vehicle_images" ON public.vehicle_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vehicle_images" ON public.vehicle_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vehicle_images" ON public.vehicle_images FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete vehicle_images" ON public.vehicle_images FOR DELETE TO authenticated USING (true);

-- invoice_repairs
DROP POLICY IF EXISTS "Public select invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Public insert invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Public update invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Public delete invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Authenticated select invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Authenticated insert invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Authenticated update invoice_repairs" ON public.invoice_repairs;
DROP POLICY IF EXISTS "Authenticated delete invoice_repairs" ON public.invoice_repairs;
CREATE POLICY "Authenticated select invoice_repairs" ON public.invoice_repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert invoice_repairs" ON public.invoice_repairs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update invoice_repairs" ON public.invoice_repairs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete invoice_repairs" ON public.invoice_repairs FOR DELETE TO authenticated USING (true);


-- ============================================================
-- FILE: 20260416103200_ats_rep_fields.sql
-- ============================================================
-- Add representative fields to authority_to_sell table
ALTER TABLE public.authority_to_sell 
ADD COLUMN IF NOT EXISTS rep_name TEXT,
ADD COLUMN IF NOT EXISTS rep_signature TEXT,
ADD COLUMN IF NOT EXISTS rep_signature_date DATE;


-- ============================================================
-- FILE: 20260422125500_add_manual_inquiry_fields.sql
-- ============================================================
-- Migration: Add manual entry fields to inquiries
ALTER TABLE public.inquiries
ADD COLUMN manual_customer_name text,
ADD COLUMN manual_customer_phone text,
ADD COLUMN manual_customer_email text,
ADD COLUMN manual_vehicle_make text,
ADD COLUMN manual_vehicle_model text,
ADD COLUMN manual_vehicle_year text;


-- ============================================================
-- FILE: 20260422130000_fix_customer_deletion_fk.sql
-- ============================================================
-- Migration: Fix customer deletion by allowing NULL on referencing columns and setting ON DELETE SET NULL

-- 1. Inquiries
ALTER TABLE public.inquiries 
DROP CONSTRAINT IF EXISTS inquiries_customer_id_fkey,
ADD CONSTRAINT inquiries_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE SET NULL;

-- 2. Repairs
ALTER TABLE public.repairs 
DROP CONSTRAINT IF EXISTS repairs_customer_id_fkey,
ADD CONSTRAINT repairs_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE SET NULL;

-- 3. Sales
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_customer_id_fkey,
ADD CONSTRAINT sales_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE SET NULL;

-- 4. Invoices (Needs NULL allowed first)
ALTER TABLE public.invoices 
ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey,
ADD CONSTRAINT invoices_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE SET NULL;


-- ============================================================
-- FILE: 20260422133000_enable_public_signing.sql
-- ============================================================
-- Migration: Enable public access for non-authenticated signing workflows

-- 1. VEHICLES: Allow anyone to view details (needed for signing agreement context)
CREATE POLICY "Public select vehicles" ON public.vehicles FOR SELECT TO anon USING (true);

-- 2. CUSTOMERS: Allow anyone to view (to see their name on sign page) and update their signature
CREATE POLICY "Public select customers" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "Public update customer signature" ON public.customers FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 3. SALES: Allow public view and signature update
CREATE POLICY "Public select sales" ON public.sales FOR SELECT TO anon USING (true);
CREATE POLICY "Public update sale signature" ON public.sales FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 4. SALE_VEHICLES: Allow public view (child of sales)
CREATE POLICY "Public select sale_vehicles" ON public.sale_vehicles FOR SELECT TO anon USING (true);

-- 5. REPAIRS: Allow public view and signature update
CREATE POLICY "Public select repairs" ON public.repairs FOR SELECT TO anon USING (true);
CREATE POLICY "Public update repair signature" ON public.repairs FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 6. INSPECTIONS: Allow public view and signature update
CREATE POLICY "Public select inspections" ON public.inspections FOR SELECT TO anon USING (true);
CREATE POLICY "Public update inspection signature" ON public.inspections FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- FILE: 20260423060000_allow_user_deletion.sql
-- ============================================================
-- Migration: Enable PERMANENT user deletion (Auth + Database records)

-- 1. Create a secure function to delete users from Supabase Auth
-- This function MUST be run in the Supabase SQL Editor to have proper permissions.
CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Security check: Only allow if the executor is a admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can delete users permanently.';
  END IF;

  -- Delete from auth.users. 
  -- Because of 'ON DELETE CASCADE' in our table definitions, 
  -- this will automatically remove their 'profiles' and 'user_roles' records.
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

-- 2. Grant access to the function
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(uuid) TO authenticated;

-- 3. Keep RLS policies as a fallback
CREATE POLICY "Super Admins can delete user roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Super Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);


-- ============================================================
-- FILE: 20260423063000_disable_auto_role.sql
-- ============================================================
-- Migration: Disable automatic role assignment for new users (Pending Approval state)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create a profile for the new user
  -- This ensures they show up in the Team list for the Super Admin
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

  -- 2. Role assignment
  -- We ONLY auto-assign 'admin' to the first user in the system.
  -- All subsequent users will have NO role by default, requiring Super Admin approval.
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- FILE: 20260423221500_add_replacement_parts_list.sql
-- ============================================================
-- Add replacement_parts_list JSONB column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS replacement_parts_list JSONB DEFAULT '[]'::jsonb;

-- Comment on the column for clarity
COMMENT ON COLUMN public.repairs.replacement_parts_list IS 'List of replacement parts with names and prices';


-- ============================================================
-- FILE: 20260423224000_add_vehicle_trim.sql
-- ============================================================
-- Add trim column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS trim TEXT;

-- Comment on the column for clarity
COMMENT ON COLUMN public.vehicles.trim IS 'Vehicle trim level (e.g., LE, XLE, Sport)';


-- ============================================================
-- FILE: 20260424121000_add_vehicle_inventory_type.sql
-- ============================================================
-- Migration: Add inventory_type to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS inventory_type text DEFAULT 'beetee';

-- Update existing records to 'beetee'
UPDATE public.vehicles SET inventory_type = 'beetee' WHERE inventory_type IS NULL;


-- ============================================================
-- FILE: 20260424122000_add_vehicle_acceptance_fields.sql
-- ============================================================
-- Migration: Add acceptance tracking fields to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS accepted_by_name text,
ADD COLUMN IF NOT EXISTS accepted_date date,
ADD COLUMN IF NOT EXISTS accepted_signature text;


-- ============================================================
-- FILE: 20260424124500_add_performance_quotes.sql
-- ============================================================
-- Migration: Add Performance Quotes tables

CREATE TABLE IF NOT EXISTS public.performance_quotes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount numeric NOT NULL DEFAULT 0,
    quote_date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL DEFAULT 'Draft',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.performance_quote_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id uuid REFERENCES public.performance_quotes(id) ON DELETE CASCADE,
    vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
    base_price numeric NOT NULL DEFAULT 0,
    has_duty boolean NOT NULL DEFAULT false,
    duty_price numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.performance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_quote_items ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming similar to sales: authenticated users can do everything)
CREATE POLICY "Enable read access for all authenticated users" ON public.performance_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.performance_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all authenticated users" ON public.performance_quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for all authenticated users" ON public.performance_quotes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.performance_quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.performance_quote_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all authenticated users" ON public.performance_quote_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for all authenticated users" ON public.performance_quote_items FOR DELETE TO authenticated USING (true);


-- ============================================================
-- FILE: 20260424130500_add_quantity_to_performance_quote_items.sql
-- ============================================================
ALTER TABLE public.performance_quote_items 
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;


-- ============================================================
-- FILE: 20260425193500_create_audit_logs.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated users to insert logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow admin to view logs
CREATE POLICY "Allow super admins to view logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
      )
    );


-- ============================================================
-- FILE: 20260425193700_fix_audit_logs_fk.sql
-- ============================================================
ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


-- ============================================================
-- FILE: 20260427060000_setup_documents_storage.sql
-- ============================================================
-- Create a public bucket for customer documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read documents
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documents' );

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' );


-- ============================================================
-- FILE: 20260427101800_add_document_urls.sql
-- ============================================================
-- Add document URL columns to track generated PDFs
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS bill_url TEXT;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS job_card_url TEXT;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE performance_quotes ADD COLUMN IF NOT EXISTS quote_url TEXT;


-- ============================================================
-- FILE: 20260427102400_update_portal_rpc.sql
-- ============================================================
-- Update get_customer_portal_data to include document URLs
CREATE OR REPLACE FUNCTION public.get_customer_portal_data(lookup_phone text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_customer RECORD;
    customer_repairs JSON;
    customer_invoices JSON;
    customer_quotes JSON;
BEGIN
    -- Find the customer
    SELECT * INTO found_customer FROM customers WHERE phone = lookup_phone LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Get repairs with vehicle info
    SELECT json_agg(r) INTO customer_repairs
    FROM (
        SELECT 
            repairs.*,
            json_build_object(
                'make', vehicles.make,
                'model', vehicles.model,
                'year', vehicles.year
            ) as vehicle
        FROM repairs
        LEFT JOIN vehicles ON repairs.vehicle_id = vehicles.id
        WHERE repairs.customer_id = found_customer.id
        ORDER BY repairs.created_at DESC
    ) r;

    -- Get invoices
    SELECT json_agg(i) INTO customer_invoices
    FROM (
        SELECT * FROM invoices 
        WHERE customer_id = found_customer.id 
        ORDER BY created_at DESC
    ) i;
    
    -- Get performance quotes
    SELECT json_agg(q) INTO customer_quotes
    FROM (
        SELECT * FROM performance_quotes 
        WHERE customer_id = found_customer.id 
        ORDER BY created_at DESC
    ) q;

    RETURN json_build_object(
        'customer', found_customer,
        'repairs', COALESCE(customer_repairs, '[]'::json),
        'invoices', COALESCE(customer_invoices, '[]'::json),
        'quotes', COALESCE(customer_quotes, '[]'::json)
    );
END;
$function$;


-- ============================================================
-- FILE: 20260428225000_add_bank_account_to_repairs.sql
-- ============================================================
-- Add bank_account column to repairs table
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT 'servicing';


-- ============================================================
-- FILE: 20260429070000_add_app_settings_table.sql
-- ============================================================
-- Create app_settings table to store application-wide configuration
-- This replaces localStorage-based permission storage so all users
-- share the same permissions regardless of device/browser.

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: authenticated users can read; only admin can write
alter table public.app_settings enable row level security;

create policy "Allow authenticated read of app_settings"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "Allow admin to upsert app_settings"
  on public.app_settings for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Seed default permissions row so it always exists
insert into public.app_settings (key, value)
values (
  'permissions',
  '{
    "admin":    { "view": ["dashboard","vehicles","customers","sales","invoices","inquiries","inspections","repairs","authority-to-sell","performance-quotes"], "edit": ["dashboard","vehicles","customers","sales","invoices","inquiries","inspections","repairs","authority-to-sell","performance-quotes"] },
    "sales":    { "view": ["dashboard","vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"], "edit": ["vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"] },
    "mechanic": { "view": ["dashboard","vehicles","repairs","inspections"], "edit": ["vehicles","repairs","inspections"] }
  }'::jsonb
)
on conflict (key) do nothing;


-- ============================================================
-- FILE: 20260429090000_enable_app_settings_realtime.sql
-- ============================================================
-- Enable Supabase Realtime on app_settings so permission changes
-- broadcast immediately to all connected clients.
-- Run this in the Supabase SQL editor if you haven't already.

-- 1. Add the table to the supabase_realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end
$$;

-- 2. Ensure the permissions row always exists (idempotent upsert)
insert into public.app_settings (key, value)
values (
  'permissions',
  '{
    "admin":    { "view": ["dashboard","vehicles","customers","sales","invoices","inquiries","inspections","repairs","authority-to-sell","performance-quotes"], "edit": ["dashboard","vehicles","customers","sales","invoices","inquiries","inspections","repairs","authority-to-sell","performance-quotes"] },
    "sales":    { "view": ["dashboard","vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"], "edit": ["vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"] },
    "mechanic": { "view": ["dashboard","vehicles","repairs","inspections"], "edit": ["vehicles","repairs","inspections"] }
  }'::jsonb
)
on conflict (key) do nothing;


-- ============================================================
-- FILE: 20260429115000_add_inspection_picker_fields.sql
-- ============================================================
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS sent_by TEXT,
ADD COLUMN IF NOT EXISTS picker_name TEXT,
ADD COLUMN IF NOT EXISTS picker_phone TEXT,
ADD COLUMN IF NOT EXISTS picker_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS picker_signature TEXT;


-- ============================================================
-- FILE: 20260429180000_add_app_settings.sql
-- ============================================================
-- Create app_settings table for configurable system settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default service interval (3 months)
INSERT INTO public.app_settings (key, value)
VALUES ('service_interval_months', '3')
ON CONFLICT (key) DO NOTHING;

-- RLS: anyone authenticated can read; only authenticated can update
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Auth users update app_settings"
  ON public.app_settings FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================================
-- FILE: 20260504191500_fix_vehicle_and_sale_deletion.sql
-- ============================================================
-- Migration: Fix vehicle and sale deletion by updating foreign key constraints

-- 1. VEHICLES references

-- Sales
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_vehicle_id_fkey,
ADD CONSTRAINT sales_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE SET NULL;

-- Sale Vehicles (join table)
ALTER TABLE public.sale_vehicles 
DROP CONSTRAINT IF EXISTS sale_vehicles_vehicle_id_fkey,
ADD CONSTRAINT sale_vehicles_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE CASCADE;

-- Repairs
ALTER TABLE public.repairs 
DROP CONSTRAINT IF EXISTS repairs_vehicle_id_fkey,
ADD CONSTRAINT repairs_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE SET NULL;

-- Inspections
ALTER TABLE public.inspections 
DROP CONSTRAINT IF EXISTS inspections_vehicle_id_fkey,
ADD CONSTRAINT inspections_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE CASCADE;

-- Inquiries
ALTER TABLE public.inquiries 
DROP CONSTRAINT IF EXISTS inquiries_vehicle_id_fkey,
ADD CONSTRAINT inquiries_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE SET NULL;

-- Performance Quote Items
ALTER TABLE public.performance_quote_items 
DROP CONSTRAINT IF EXISTS performance_quote_items_vehicle_id_fkey,
ADD CONSTRAINT performance_quote_items_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES public.vehicles(id) 
  ON DELETE SET NULL;


-- 2. SALES references

-- Sale Vehicles (join table)
ALTER TABLE public.sale_vehicles 
DROP CONSTRAINT IF EXISTS sale_vehicles_sale_id_fkey,
ADD CONSTRAINT sale_vehicles_sale_id_fkey 
  FOREIGN KEY (sale_id) 
  REFERENCES public.sales(id) 
  ON DELETE CASCADE;

-- Invoices
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_sale_id_fkey,
ADD CONSTRAINT invoices_sale_id_fkey 
  FOREIGN KEY (sale_id) 
  REFERENCES public.sales(id) 
  ON DELETE SET NULL;


-- ============================================================
-- FILE: 20260505_add_accepted_by_phone.sql
-- ============================================================
-- Add phone number field for the person who brought the resale vehicle
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS accepted_by_phone TEXT DEFAULT NULL;


-- ============================================================
-- FILE: 20260505_add_source_company_phone.sql
-- ============================================================
-- Add phone number field for the company the vehicle is from
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source_company_phone TEXT DEFAULT NULL;


-- ============================================================
-- FILE: 20260505_add_source_rep_details.sql
-- ============================================================
-- Add representative details for the person sent by the source company
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source_rep_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_rep_phone TEXT DEFAULT NULL;


-- ============================================================
-- FILE: 20260505_create_sale_payments.sql
-- ============================================================
-- Create sale_payments table for tracking partial payments
CREATE TABLE IF NOT EXISTS sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" ON sale_payments
  FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- FILE: 20260506070000_fix_profiles_schema.sql
-- ============================================================
-- Fix: The RLS UPDATE policy on profiles was checking auth.uid() = id (random UUID PK),
-- which NEVER matches. The correct check is auth.uid() = user_id (FK to auth.users).
-- This caused all profile update attempts to be silently blocked by RLS.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also add updated_at column (was referenced in code but missing from DB)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;


-- ============================================================
-- FILE: 20260506080000_create_repair_payments.sql
-- ============================================================
-- Create repair_payments table mirroring sale_payments
CREATE TABLE IF NOT EXISTS repair_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID REFERENCES repairs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE repair_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON repair_payments
  FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- FILE: 20260513_add_source_rep_signature.sql
-- ============================================================
-- Add signature field for the person who brought the car (source representative)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source_rep_signature TEXT DEFAULT NULL;


-- ============================================================
-- FILE: 20260603000000_add_inquiry_advanced_fields.sql
-- ============================================================
-- Migration: Add advanced inquiry fields

ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS taken_by text,
ADD COLUMN IF NOT EXISTS advanced_questionnaire jsonb DEFAULT '{}'::jsonb;


-- ============================================================
-- FILE: 20260603120000_create_documents_table.sql
-- ============================================================
-- Migration: Create cloud-synced documents table

CREATE TABLE IF NOT EXISTS public.documents (
  id           text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Untitled Document',
  content      text NOT NULL DEFAULT '',
  letterhead   boolean NOT NULL DEFAULT false,
  watermark    boolean NOT NULL DEFAULT false,
  watermark_opacity numeric(4,3) NOT NULL DEFAULT 0.08,
  margins      text NOT NULL DEFAULT 'normal',
  orientation  text NOT NULL DEFAULT 'portrait',
  font_family  text NOT NULL DEFAULT '''Outfit'', sans-serif',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS: each user can only see and manage their own documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- FILE: 20260604130000_add_vehicle_description_to_quote_items.sql
-- ============================================================
-- Allow manual vehicle entry in proforma quotes
-- vehicle_id is already nullable; add a free-text description field
ALTER TABLE public.performance_quote_items
ADD COLUMN IF NOT EXISTS vehicle_description text;


-- ============================================================
-- FILE: authority_to_sell_setup.sql
-- ============================================================
-- Run this in your Supabase SQL Editor
-- Drop old table if it exists (no data yet)
DROP TABLE IF EXISTS public.authority_to_sell;

-- Create table matching official Bee Tee ATS document
CREATE TABLE public.authority_to_sell (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Agreement meta
    agreement_date DATE DEFAULT CURRENT_DATE,

    -- Owner details
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_phone TEXT,
    customer_id_type TEXT,

    -- Vehicle details
    vehicle_make TEXT NOT NULL,
    vehicle_year_model TEXT,
    vehicle_color TEXT,
    vehicle_engine_number TEXT,
    vehicle_chassis TEXT,

    -- Authority terms
    valid_until DATE,
    note TEXT,

    -- Signature (Base64)
    signature TEXT,

    -- Audit
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.authority_to_sell ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
CREATE POLICY "Authenticated users can manage ATS"
ON public.authority_to_sell FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Indexes for fast search
CREATE INDEX idx_ats_customer_name ON public.authority_to_sell (customer_name);
CREATE INDEX idx_ats_vehicle_make  ON public.authority_to_sell (vehicle_make);
CREATE INDEX idx_ats_date          ON public.authority_to_sell (agreement_date);


