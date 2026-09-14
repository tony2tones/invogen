-- Invoice by Two Tones Digital — initial schema
-- Multi-business: one auth user can own multiple business_profiles.
-- All clients/products/invoices are scoped to a business_id, and RLS walks
-- business_profiles.user_id = auth.uid() to authorize access.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (user_id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on profiles for update using (user_id = auth.uid());
create policy "profiles_delete_own" on profiles for delete using (user_id = auth.uid());

-- Auto-create a profile + starter credit wallet on signup.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id) values (new.id);
  insert into credit_wallet (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- business_profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  logo_url text,
  primary_color text not null default '#111827',
  vat_number text,
  currency text not null default 'ZAR',
  invoice_prefix text not null default 'INV',
  next_invoice_number int not null default 1,
  bank_name text,
  account_holder text,
  account_number text,
  branch_code text,
  account_type text,
  swift_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_profiles_user_id on business_profiles(user_id);

alter table business_profiles enable row level security;

create policy "business_profiles_select_own" on business_profiles for select using (user_id = auth.uid());
create policy "business_profiles_insert_own" on business_profiles for insert with check (user_id = auth.uid());
create policy "business_profiles_update_own" on business_profiles for update using (user_id = auth.uid());
create policy "business_profiles_delete_own" on business_profiles for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  vat_number text,
  notes text,
  quickbooks_customer_id text,
  created_at timestamptz not null default now()
);

-- Fast "search by name within a business" — the 2-tap client picker.
create index if not exists idx_clients_business_name on clients(business_id, name);
create index if not exists idx_clients_business_phone on clients(business_id, phone);

alter table clients enable row level security;

create policy "clients_select_own" on clients for select using (
  exists (select 1 from business_profiles bp where bp.id = clients.business_id and bp.user_id = auth.uid())
);
create policy "clients_insert_own" on clients for insert with check (
  exists (select 1 from business_profiles bp where bp.id = clients.business_id and bp.user_id = auth.uid())
);
create policy "clients_update_own" on clients for update using (
  exists (select 1 from business_profiles bp where bp.id = clients.business_id and bp.user_id = auth.uid())
);
create policy "clients_delete_own" on clients for delete using (
  exists (select 1 from business_profiles bp where bp.id = clients.business_id and bp.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric not null,
  unit text not null default 'unit',
  vat_rate numeric not null default 0,
  sku text,
  quickbooks_item_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_business_name on products(business_id, name);
create index if not exists idx_products_business_active on products(business_id, is_active);

alter table products enable row level security;

create policy "products_select_own" on products for select using (
  exists (select 1 from business_profiles bp where bp.id = products.business_id and bp.user_id = auth.uid())
);
create policy "products_insert_own" on products for insert with check (
  exists (select 1 from business_profiles bp where bp.id = products.business_id and bp.user_id = auth.uid())
);
create policy "products_update_own" on products for update using (
  exists (select 1 from business_profiles bp where bp.id = products.business_id and bp.user_id = auth.uid())
);
create policy "products_delete_own" on products for delete using (
  exists (select 1 from business_profiles bp where bp.id = products.business_id and bp.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- invoices
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  type text not null default 'invoice' check (type in ('invoice','quote')),
  subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  vat_rate numeric not null default 0,
  description text,
  notes text,
  terms text,
  due_date date,
  issue_date date not null default now(),
  quickbooks_invoice_id text,
  quickbooks_sync_status text not null default 'not_synced',
  is_offline boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_business_id on invoices(business_id, created_at desc);
create index if not exists idx_invoices_client_id on invoices(client_id);
create unique index if not exists idx_invoices_business_number on invoices(business_id, invoice_number);

alter table invoices enable row level security;

create policy "invoices_select_own" on invoices for select using (
  exists (select 1 from business_profiles bp where bp.id = invoices.business_id and bp.user_id = auth.uid())
);
create policy "invoices_insert_own" on invoices for insert with check (
  exists (select 1 from business_profiles bp where bp.id = invoices.business_id and bp.user_id = auth.uid())
);
create policy "invoices_update_own" on invoices for update using (
  exists (select 1 from business_profiles bp where bp.id = invoices.business_id and bp.user_id = auth.uid())
);
create policy "invoices_delete_own" on invoices for delete using (
  exists (select 1 from business_profiles bp where bp.id = invoices.business_id and bp.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- invoice_items
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0
);

create index if not exists idx_invoice_items_invoice_id on invoice_items(invoice_id);

alter table invoice_items enable row level security;

create policy "invoice_items_select_own" on invoice_items for select using (
  exists (
    select 1 from invoices i
    join business_profiles bp on bp.id = i.business_id
    where i.id = invoice_items.invoice_id and bp.user_id = auth.uid()
  )
);
create policy "invoice_items_insert_own" on invoice_items for insert with check (
  exists (
    select 1 from invoices i
    join business_profiles bp on bp.id = i.business_id
    where i.id = invoice_items.invoice_id and bp.user_id = auth.uid()
  )
);
create policy "invoice_items_update_own" on invoice_items for update using (
  exists (
    select 1 from invoices i
    join business_profiles bp on bp.id = i.business_id
    where i.id = invoice_items.invoice_id and bp.user_id = auth.uid()
  )
);
create policy "invoice_items_delete_own" on invoice_items for delete using (
  exists (
    select 1 from invoices i
    join business_profiles bp on bp.id = i.business_id
    where i.id = invoice_items.invoice_id and bp.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────
-- credit_wallet
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists credit_wallet (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  balance int not null default 10,
  total_used int not null default 0
);

alter table credit_wallet enable row level security;

create policy "credit_wallet_select_own" on credit_wallet for select using (user_id = auth.uid());
create policy "credit_wallet_update_own" on credit_wallet for update using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- integrations (QuickBooks OAuth table — no OAuth flow built yet)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  provider text not null,
  realm_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_integrations_business_provider on integrations(business_id, provider);

alter table integrations enable row level security;

create policy "integrations_select_own" on integrations for select using (
  exists (select 1 from business_profiles bp where bp.id = integrations.business_id and bp.user_id = auth.uid())
);
create policy "integrations_insert_own" on integrations for insert with check (
  exists (select 1 from business_profiles bp where bp.id = integrations.business_id and bp.user_id = auth.uid())
);
create policy "integrations_update_own" on integrations for update using (
  exists (select 1 from business_profiles bp where bp.id = integrations.business_id and bp.user_id = auth.uid())
);
create policy "integrations_delete_own" on integrations for delete using (
  exists (select 1 from business_profiles bp where bp.id = integrations.business_id and bp.user_id = auth.uid())
);

-- Trigger must be created after credit_wallet exists (handle_new_user writes to both tables).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Atomic invoice-number allocation.
-- Concurrent "new invoice" taps on the same business must never collide, so
-- the increment happens server-side in one round trip instead of read-then-write
-- from the client.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function next_invoice_number(p_business_id uuid, p_type text)
returns text as $$
declare
  v_prefix text;
  v_next int;
  v_owner uuid;
begin
  select user_id, invoice_prefix, next_invoice_number
    into v_owner, v_prefix, v_next
    from business_profiles
    where id = p_business_id
    for update;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update business_profiles set next_invoice_number = v_next + 1 where id = p_business_id;

  if p_type = 'quote' then
    return 'QUO-' || lpad(v_next::text, 4, '0');
  end if;

  return v_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage policy helper. The Storage API connects as `supabase_storage_admin`,
-- a role with no grants on our own tables, so a storage policy can't read
-- business_profiles directly to check ownership. security definer runs this
-- with the function owner's privileges instead, while auth.uid() still
-- resolves correctly from the caller's JWT.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function owns_business(p_business_id text)
returns boolean as $$
  select exists (
    select 1 from business_profiles bp where bp.id::text = p_business_id and bp.user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: generated invoice/quote PDFs, keyed as "<business_id>/<invoice_id>.pdf".
-- Public read so a WhatsApp/email link works for the client with no login;
-- writes are still restricted to the owning business's user.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', true)
on conflict (id) do nothing;

create policy "invoice_pdfs_public_read" on storage.objects for select using (bucket_id = 'invoice-pdfs');

create policy "invoice_pdfs_owner_write" on storage.objects for insert with check (
  bucket_id = 'invoice-pdfs' and owns_business((storage.foldername(name))[1])
);

create policy "invoice_pdfs_owner_update" on storage.objects for update using (
  bucket_id = 'invoice-pdfs' and owns_business((storage.foldername(name))[1])
);

create policy "invoice_pdfs_owner_delete" on storage.objects for delete using (
  bucket_id = 'invoice-pdfs' and owns_business((storage.foldername(name))[1])
);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: business logos, keyed as "<business_id>/logo.<ext>". Public read
-- so the logo renders on client-facing PDFs with no auth.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "business_logos_public_read" on storage.objects for select using (bucket_id = 'business-logos');

create policy "business_logos_owner_write" on storage.objects for insert with check (
  bucket_id = 'business-logos' and owns_business((storage.foldername(name))[1])
);

create policy "business_logos_owner_update" on storage.objects for update using (
  bucket_id = 'business-logos' and owns_business((storage.foldername(name))[1])
);

create policy "business_logos_owner_delete" on storage.objects for delete using (
  bucket_id = 'business-logos' and owns_business((storage.foldername(name))[1])
);
