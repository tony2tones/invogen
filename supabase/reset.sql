-- Full reset: drops every app table/function/trigger, clears the storage
-- buckets, and deletes all Auth users. Run this in the Supabase SQL editor,
-- then re-run supabase/migrations/0001_init.sql to rebuild a clean schema.
--
-- WARNING: irreversible. This wipes all data and every signed-up user.

-- 1. Drop the signup trigger/functions first so nothing fires against
--    tables we're about to drop.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists next_invoice_number(uuid, text);

-- 2. Drop app tables. CASCADE takes their policies, indexes and FKs with them.
drop table if exists invoice_items cascade;
drop table if exists invoices cascade;
drop table if exists integrations cascade;
drop table if exists products cascade;
drop table if exists clients cascade;
drop table if exists credit_wallet cascade;
drop table if exists business_profiles cascade;
drop table if exists profiles cascade;

-- 3. Clear the storage buckets used for invoice PDFs and business logos.
-- If files were actually uploaded, also verify they're gone under
-- Storage in the dashboard — deleting the metadata row here doesn't always
-- guarantee the underlying blob is purged.
delete from storage.objects where bucket_id in ('invoice-pdfs', 'business-logos');
delete from storage.buckets where id in ('invoice-pdfs', 'business-logos');

-- 4. Remove all Auth users (test sign-ups). Cascades their sessions/identities.
delete from auth.users;
