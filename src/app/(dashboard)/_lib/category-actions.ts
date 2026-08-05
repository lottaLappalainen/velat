"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

// ownerId is whichever side is currently the *debtor* on the transaction
// being logged — not necessarily the caller. RLS (categories-dashboard.md)
// allows creating a category for an accepted friend, mirroring how
// transactions itself already lets either participant act on the pair.
export async function createCategory(
  ownerId: string,
  name: string
): Promise<ActionResult & { categoryId?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("categories")
    .insert({ owner_id: ownerId, name: trimmed, created_by: claims.claims.sub })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation — the case-insensitive (owner_id, name) index
    // caught a collision. Any other error here (e.g. ownerId isn't actually
    // an accepted friend) is the RLS insert policy rejecting it.
    if (error.code === "23505") {
      return { error: `Already have a category named "${trimmed}".` };
    }
    return { error: "Couldn't create category." };
  }

  return { error: null, categoryId: data.id };
}
