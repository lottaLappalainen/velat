import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes reachable without a session. Everything else is protected by
// default — same "default deny" posture as the RLS policies (see
// docs/tasks/authorization.md) rather than an allowlist that has to be kept
// in sync with every new page.
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string) {
  // /auth/callback must stay reachable while signed out — it's the route
  // that exchanges the email-confirmation code for a session in the first
  // place (see docs/tasks/authorization.md, Phase 3).
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

// Called from src/proxy.ts on every request. Refreshes the Supabase session
// cookie (optimistic check only — see Next's authentication guide, "Optimistic
// checks with Proxy") and gates access to protected routes.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Until the Supabase project has real credentials (Phase 1's dashboard
  // steps — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are declared in .env but still
  // empty as of this writing) or if the project is briefly unreachable, fail
  // closed to "not authenticated" instead of throwing and taking down every
  // route. createServerClient() itself throws synchronously on empty
  // credentials, so it has to be inside this try, not just the auth call.
  let isAuthenticated = false;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.getClaims();
    isAuthenticated = data !== null;
  } catch {
    isAuthenticated = false;
  }

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
