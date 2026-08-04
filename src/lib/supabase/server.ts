import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Create a fresh client per request — never share/cache across requests.
// For use in Server Components, Server Actions, and Route Handlers.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Harmless as long as src/proxy.ts is refreshing the session on
            // every request — it's the one that actually persists the cookie.
          }
        },
      },
    }
  );
}
