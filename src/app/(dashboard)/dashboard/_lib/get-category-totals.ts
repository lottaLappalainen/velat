import type { createClient } from "@/lib/supabase/server";

export type CategoryTotal = {
  categoryId: string;
  name: string;
  total: number;
};

// Live grouped total, nothing stored — see docs/tasks/categories-dashboard.md,
// "should stats be stored or computed live?" The grouping happens in JS
// after a plain select, same convention as every other multi-row merge in
// this codebase (get-friend-balances.ts, get-friendships.ts) rather than a
// PostgREST aggregate query — consistent, and plenty fast at this app's scale.
export async function getCategoryTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string,
  range: { start: Date | null; end: Date | null }
): Promise<{ total: number; byCategory: CategoryTotal[] }> {
  let query = supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("debtor_id", viewerId)
    .is("deleted_at", null);

  if (range.start) query = query.gte("created_at", range.start.toISOString());
  if (range.end) query = query.lt("created_at", range.end.toISOString());

  const { data: rows } = await query;

  const sums = new Map<string, number>();
  for (const row of rows ?? []) {
    sums.set(row.category_id, (sums.get(row.category_id) ?? 0) + row.amount);
  }

  if (sums.size === 0) {
    return { total: 0, byCategory: [] };
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", [...sums.keys()]);

  const byCategory = [...sums.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: categories?.find((category) => category.id === categoryId)?.name ?? "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const total = byCategory.reduce((sum, category) => sum + category.total, 0);

  return { total, byCategory };
}
