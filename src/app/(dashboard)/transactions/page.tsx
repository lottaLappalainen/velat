import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPresets } from "@/app/(dashboard)/_lib/get-presets";
import { TransactionRow, type TransactionRowData } from "@/app/(dashboard)/_components/transaction-row";
import { AddTransactionForm } from "./_components/add-transaction-form";
import type { FriendOption } from "./_components/friend-picker";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const viewerId = claims.claims.sub;

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);

  const friendIds = (friendships ?? []).map((friendship) =>
    friendship.requester_id === viewerId ? friendship.addressee_id : friendship.requester_id
  );

  // Fetch friend profiles plus the viewer's own — the latter is never shown
  // as a "friend" option, just needed to resolve "added by" on rows the
  // viewer themselves created.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", [...friendIds, viewerId]);

  const friends: FriendOption[] = friendIds
    .map((id) => {
      const profile = profiles?.find((candidate) => candidate.id === id);
      return profile ? { id, username: profile.username, avatarUrl: profile.avatar_url } : null;
    })
    .filter((friend): friend is FriendOption => friend !== null)
    .sort((a, b) => a.username.localeCompare(b.username));

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, creditor_id, debtor_id, amount, currency, name, created_by, created_at")
    .is("deleted_at", null)
    .or(`creditor_id.eq.${viewerId},debtor_id.eq.${viewerId}`)
    .order("created_at", { ascending: false });

  const rows = (transactions ?? []).map((transaction) => {
    const counterpartyId = transaction.creditor_id === viewerId ? transaction.debtor_id : transaction.creditor_id;
    const counterpartyProfile = profiles?.find((candidate) => candidate.id === counterpartyId);

    const row: TransactionRowData = {
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: transaction.created_at,
      isOwedToViewer: transaction.creditor_id === viewerId,
      addedByUsername: transaction.created_by === viewerId ? "You" : counterpartyProfile?.username ?? "Friend",
      counterparty: {
        username: counterpartyProfile?.username ?? "Unknown",
        avatarUrl: counterpartyProfile?.avatar_url ?? null,
      },
    };

    return { row, friendId: counterpartyId };
  });

  const presets = await getPresets(supabase, viewerId);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transactions</h1>

      {friends.length === 0 ? (
        // RLS would reject a transaction with no friend to log it against —
        // the UI shouldn't invite a submission guaranteed to fail. See
        // docs/tasks/transactions-ui.md.
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">Add a friend before logging a transaction.</p>
          <Link href="/profile" className="text-sm font-medium text-foreground underline underline-offset-2">
            Go to Profile
          </Link>
        </div>
      ) : (
        <AddTransactionForm friends={friends} presets={presets} />
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map(({ row, friendId }) => (
            <Link key={row.id} href={`/friends/${friendId}`} className="block">
              <TransactionRow transaction={row} />
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
