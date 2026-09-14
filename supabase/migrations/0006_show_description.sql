-- Lets an invoice/quote hide its description section (manual text + any
-- catalog product descriptions) without deleting the underlying text, so
-- toggling it back on later restores exactly what was there. Defaults to
-- true so existing invoices keep showing their description as before.

alter table invoices add column if not exists show_description boolean not null default true;
