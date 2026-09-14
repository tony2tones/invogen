# Invoice by Two Tones Digital

Mobile-first PWA for small SA businesses to create invoices & quotes fast.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, Supabase (auth/DB/storage), `@react-pdf/renderer`, `next-pwa` + `idb` for offline.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migration**: in the Supabase SQL editor, paste and run `supabase/migrations/0001_init.sql`. This creates all tables, RLS policies, the `next_invoice_number` RPC, and the `invoice-pdfs` / `business-logos` storage buckets.
3. **Env vars**: copy `.env.local.example` to `.env.local` and fill in your project's URL + anon key (Project Settings → API).
4. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
5. Sign up, create your first business profile, and start invoicing.

## Notes

- **Offline**: creating an invoice while offline queues it in IndexedDB (`idb`) and syncs automatically once back online (see `src/lib/offline`).
- **PDF**: generated client-side with `@react-pdf/renderer`; "Save & WhatsApp" uploads the PDF to the `invoice-pdfs` storage bucket and opens a `wa.me` link with the public link.
- **QuickBooks**: the `integrations` table and Settings → Integrations UI are scaffolded, but the OAuth flow itself is intentionally not implemented yet. "Export CSV for QuickBooks" works today as a stopgap.
- **Multi-business**: switch businesses from the header dropdown; all data (clients/products/invoices) is scoped by `business_id` and enforced via RLS.
