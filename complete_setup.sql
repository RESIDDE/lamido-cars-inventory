-- ==============================================================================
-- LAMIDO CARS - COMPLETE DATABASE INITIALIZATION SCRIPT
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/vuxssslfeqbgozeconvd/sql/new
-- ==============================================================================

-- 0. Helper Functions & Types
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'mechanic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'admin'
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Automatic Profile & Role on Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  cost_price numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'Available',
  inventory_type text NOT NULL DEFAULT 'lamido',
  vin text UNIQUE,
  trim text,
  color text,
  mileage numeric,
  fuel_type text,
  transmission text,
  num_keys integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'Used',
  description text,
  image_url text,
  source_company text,
  source_company_phone text,
  source_rep_name text,
  source_rep_phone text,
  source_rep_signature text,
  accepted_by_name text,
  accepted_by_phone text,
  accepted_date date,
  accepted_signature text,
  date_arrived date,
  date_stored date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vehicles full access" ON public.vehicles;
CREATE POLICY "Vehicles full access" ON public.vehicles FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Vehicle Images
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vehicle images access" ON public.vehicle_images;
CREATE POLICY "Vehicle images access" ON public.vehicle_images FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  signature_data text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers full access" ON public.customers;
CREATE POLICY "Customers full access" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  sale_price numeric NOT NULL DEFAULT 0,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_type text DEFAULT 'cash',
  payment_status text DEFAULT 'paid_in_full',
  notes text,
  rep_name text,
  rep_signature text,
  rep_signature_date date,
  buyer_signature text,
  buyer_signature_date date,
  receipt_url text,
  salesperson_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sales full access" ON public.sales;
CREATE POLICY "Sales full access" ON public.sales FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. Sale Vehicles (Multi-vehicle sales support)
CREATE TABLE IF NOT EXISTS public.sale_vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sale vehicles access" ON public.sale_vehicles;
CREATE POLICY "Sale vehicles access" ON public.sale_vehicles FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Sale Payments
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date timestamptz DEFAULT now(),
  payment_method text DEFAULT 'cash',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sale payments access" ON public.sale_payments;
CREATE POLICY "Sale payments access" ON public.sale_payments FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  invoice_type text NOT NULL DEFAULT 'sale',
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invoices full access" ON public.invoices;
CREATE POLICY "Invoices full access" ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);

-- 11. Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  manual_customer_name text,
  manual_customer_phone text,
  manual_customer_email text,
  manual_vehicle_make text,
  manual_vehicle_model text,
  manual_vehicle_year text,
  taken_by text,
  advanced_questionnaire jsonb DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inquiries full access" ON public.inquiries;
CREATE POLICY "Inquiries full access" ON public.inquiries FOR ALL TO public USING (true) WITH CHECK (true);

-- 12. Performance Quotes Table
CREATE TABLE IF NOT EXISTS public.performance_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft',
  notes text,
  quote_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quotes access" ON public.performance_quotes;
CREATE POLICY "Quotes access" ON public.performance_quotes FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.performance_quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES public.performance_quotes(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_description text,
  base_price numeric NOT NULL DEFAULT 0,
  has_duty boolean NOT NULL DEFAULT false,
  duty_price numeric DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quote items access" ON public.performance_quote_items;
CREATE POLICY "Quote items access" ON public.performance_quote_items FOR ALL TO public USING (true) WITH CHECK (true);

-- 13. Authority to Sell Table
CREATE TABLE IF NOT EXISTS public.authority_to_sell (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_date date DEFAULT CURRENT_DATE,
  customer_name text NOT NULL,
  customer_address text,
  customer_phone text,
  customer_id_type text,
  vehicle_make text NOT NULL,
  vehicle_year_model text,
  vehicle_color text,
  vehicle_engine_number text,
  vehicle_chassis text,
  valid_until date,
  note text,
  signature text,
  rep_name text,
  rep_signature text,
  rep_signature_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.authority_to_sell ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ATS full access" ON public.authority_to_sell;
CREATE POLICY "ATS full access" ON public.authority_to_sell FOR ALL TO public USING (true) WITH CHECK (true);

-- 14. App Settings Table (Permissions, Config)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "App settings read" ON public.app_settings;
CREATE POLICY "App settings read" ON public.app_settings FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "App settings update" ON public.app_settings;
CREATE POLICY "App settings update" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES 
  ('permissions', '{"admin": {"view": ["dashboard","vehicles","customers","sales","invoices","inquiries","authority-to-sell","performance-quotes"], "create": ["dashboard","vehicles","customers","sales","invoices","inquiries","authority-to-sell","performance-quotes"], "edit": ["dashboard","vehicles","customers","sales","invoices","inquiries","authority-to-sell","performance-quotes"]}, "sales": {"view": ["dashboard","vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"], "create": ["vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"], "edit": ["vehicles","customers","sales","invoices","inquiries","performance-quotes","authority-to-sell"]}, "mechanic": {"view": ["dashboard","vehicles"], "create": ["vehicles"], "edit": ["vehicles"]}}'::jsonb),
  ('service_interval_months', '"3"'::jsonb),
  ('service_interval_days', '"0"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 15. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs full access" ON public.audit_logs;
CREATE POLICY "Audit logs full access" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 16. Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('vehicle-images', 'vehicle-images', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Storage vehicle images" ON storage.objects;
CREATE POLICY "Storage vehicle images" ON storage.objects FOR ALL TO public USING (bucket_id IN ('vehicle-images', 'documents')) WITH CHECK (bucket_id IN ('vehicle-images', 'documents'));

-- Enable realtime for app settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
