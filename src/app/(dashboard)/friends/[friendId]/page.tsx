import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPresets } from "@/app/(dashboard)/_lib/get-presets";
import { BalanceHeader } from "./_components/balance-header";
import { DebtForm } from "./_components/debt-form";
import { DebtList } from "./_components/debt-list";

export default async function FriendPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const viewerId = claims.claims.sub;

  // Confirm this is actually an accepted friend. RLS already prevents
  // reading another pair's transactions either way, but a clean 404 beats a
  // silently-empty page for "random uuid" / "request still pending" cases.
  const { data: friendship } = await supabase
    .from("friendships")
    .select("status")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${friendId}),and(addressee_id.eq.${viewerId},requester_id.eq.${friendId})`
    )
    .maybeSingle();

  if (!friendship) notFound();

  const { data: friendProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", friendId)
    .single();

  const friendUsername = friendProfile?.username ?? "friend";

  const { data: balanceRow } = await supabase
    .from("balances")
    .select("user_a, user_b, net_amount")
    .or(`and(user_a.eq.${viewerId},user_b.eq.${friendId}),and(user_a.eq.${friendId},user_b.eq.${viewerId})`)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, creditor_id, debtor_id, amount, currency, name, created_by, created_at")
    .is("deleted_at", null)
    .or(
      `and(creditor_id.eq.${viewerId},debtor_id.eq.${friendId}),and(creditor_id.eq.${friendId},debtor_id.eq.${viewerId})`
    )
    .order("created_at", { ascending: false });

  const presets = await getPresets(supabase, viewerId);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{friendUsername}</h1>

      <BalanceHeader friendUsername={friendUsername} viewerId={viewerId} balanceRow={balanceRow ?? null} />

      <DebtForm friendId={friendId} friendUsername={friendUsername} viewerId={viewerId} presets={presets} />

      <DebtList transactions={transactions ?? []} viewerId={viewerId} friendUsername={friendUsername} />
    </div>
  );
}
