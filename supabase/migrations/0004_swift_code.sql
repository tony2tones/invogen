-- Adds a SWIFT/BIC code to business_profiles for international clients paying
-- via international wire transfer. Safe to run on an existing database.

alter table business_profiles add column if not exists swift_code text;
