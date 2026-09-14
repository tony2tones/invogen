-- Adds banking details to business_profiles so they can appear on
-- invoices/quotes. Safe to run on an existing database.

alter table business_profiles add column if not exists bank_name text;
alter table business_profiles add column if not exists account_holder text;
alter table business_profiles add column if not exists account_number text;
alter table business_profiles add column if not exists branch_code text;
alter table business_profiles add column if not exists account_type text;
