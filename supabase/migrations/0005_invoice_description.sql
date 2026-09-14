-- Adds a free-text description of the goods/services rendered above the line
-- items table on invoices and quotes (distinct from notes/terms, which show
-- below the totals). Safe to run on an existing database.

alter table invoices add column if not exists description text;
