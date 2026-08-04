import type { createClient } from "@/lib/supabase/server";

export type Preset = {
  id: string;
  name: string;
  amount: number;
  currency: string;
};

// This user's saved name+amount shortcuts, newest first. See
// docs/tasks/debt-ledger.md, "Saved presets."
export async function getPresets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string
): Promise<Preset[]> {
  const { data } = await supabase
    .from("transaction_presets")
    .select("id, name, amount, currency")
    .eq("owner_id", viewerId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
