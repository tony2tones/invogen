import { createBrowserClient } from '@supabase/ssr';

// Untyped on purpose: this project has no generated Supabase schema types, and
// threading a hand-written Database generic through @supabase/supabase-js's
// strict generic constraints caused every query builder call to collapse to
// `never`. Call sites annotate the shapes they read/write instead.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
