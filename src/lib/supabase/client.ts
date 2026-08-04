import { createBrowserClient } from "@supabase/ssr";

// Safe to call from Client Components — uses the public anon key, which is
// scoped entirely by Postgres RLS (see docs/tasks/authorization.md).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
