import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the PKCE code from an email-confirmation link for a session.
// @supabase/ssr clients default to the PKCE flow specifically because the
// browser that requested signup and the one that opens the email link are
// often different environments — see docs/tasks/authorization.md.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
