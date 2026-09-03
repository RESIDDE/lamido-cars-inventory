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
