-- Idempotent storage fix — safe to run any number of times.
--
-- Root cause: the Storage API connects to Postgres as `supabase_storage_admin`,
-- a role with no grants on our own tables. The original policies did
-- `exists (select 1 from business_profiles ...)` directly, which that role
-- can't read, so the check silently evaluated false and every upload was
-- rejected with "new row violates row-level security policy for table
-- objects". This wraps the ownership check in a `security definer` function,
-- which runs with the function owner's privileges regardless of the caller's
-- role, while auth.uid() still resolves correctly from the request's JWT.

create or replace function owns_business(p_business_id text)
returns boolean as $$
  select exists (
    select 1 from business_profiles bp where bp.id::text = p_business_id and bp.user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

drop policy if exists "invoice_pdfs_public_read" on storage.objects;
drop policy if exists "invoice_pdfs_owner_write" on storage.objects;
drop policy if exists "invoice_pdfs_owner_update" on storage.objects;
drop policy if exists "invoice_pdfs_owner_delete" on storage.objects;
drop policy if exists "business_logos_public_read" on storage.objects;
drop policy if exists "business_logos_owner_write" on storage.objects;
drop policy if exists "business_logos_owner_update" on storage.objects;
drop policy if exists "business_logos_owner_delete" on storage.objects;

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
