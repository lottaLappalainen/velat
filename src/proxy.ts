import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Renamed from `middleware.ts` — Next.js 16 deprecated the `middleware`
// convention in favor of `proxy` (same runtime behavior, new file/export
// name). See node_modules/next/dist/docs/.../file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next's own internals —
    // running proxy on those would block CSS/JS/images from loading.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
