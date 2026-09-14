-- Business expense tracking. Scoped to business_id like everything else,
-- with an optional receipt photo in a private storage bucket (unlike
-- invoice PDFs/logos, receipts have no reason to be publicly readable).

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  category text not null default 'other',
  vendor text,
  description text,
  amount numeric not null,
  vat_amount numeric not null default 0,
  payment_method text,
  receipt_path text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_business_date on expenses(business_id, expense_date desc);
create index if not exists idx_expenses_business_category on expenses(business_id, category);

alter table expenses enable row level security;

create policy "expenses_select_own" on expenses for select using (
  exists (select 1 from business_profiles bp where bp.id = expenses.business_id and bp.user_id = auth.uid())
);
create policy "expenses_insert_own" on expenses for insert with check (
  exists (select 1 from business_profiles bp where bp.id = expenses.business_id and bp.user_id = auth.uid())
);
create policy "expenses_update_own" on expenses for update using (
  exists (select 1 from business_profiles bp where bp.id = expenses.business_id and bp.user_id = auth.uid())
);
create policy "expenses_delete_own" on expenses for delete using (
  exists (select 1 from business_profiles bp where bp.id = expenses.business_id and bp.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: expense receipt photos, keyed as "<business_id>/<expense_id>.<ext>".
-- Private (not public) — receipts are read back via a signed URL, never a
-- plain public link. Uses the owns_business() helper from the storage-policy
-- fix (see supabase/fix-storage.sql) since the Storage API can't read
-- business_profiles directly under its own role.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

create policy "expense_receipts_owner_read" on storage.objects for select using (
  bucket_id = 'expense-receipts' and owns_business((storage.foldername(name))[1])
);

create policy "expense_receipts_owner_write" on storage.objects for insert with check (
  bucket_id = 'expense-receipts' and owns_business((storage.foldername(name))[1])
);

create policy "expense_receipts_owner_update" on storage.objects for update using (
  bucket_id = 'expense-receipts' and owns_business((storage.foldername(name))[1])
);

create policy "expense_receipts_owner_delete" on storage.objects for delete using (
  bucket_id = 'expense-receipts' and owns_business((storage.foldername(name))[1])
);
