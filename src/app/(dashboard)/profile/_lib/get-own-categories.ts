import type { createClient } from "@/lib/supabase/server";

export type OwnCategory = { id: string; name: string };

// The viewer's own categories — the ones usable whenever the viewer is the
// debtor on a transaction. See _lib/category-actions.ts and supabase/
// migrations/20260805130000_categories.sql: categories have no update/delete
// RLS policy ("no rename/delete in v1"), so this list is create + view only.
export async function getOwnCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<OwnCategory[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .eq("owner_id", userId)
    .order("name", { ascending: true });

  return data ?? [];
}