import type { createClient } from "@/lib/supabase/server";
import { getViewerRelativeBalance, type ViewerRelativeBalance } from "@/lib/format";

export type FriendBalance = {
  friendId: string;
  username: string;
  avatarUrl: string | null;
  balance: ViewerRelativeBalance;
};

// One row per accepted friend, with a viewer-relative balance already
// resolved — see docs/tasks/homepage-ui.md, "Data needed." Colocated here
// since the home page is currently its only consumer.
export async function getFriendBalances(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string
): Promise<FriendBalance[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);

  const friendIds = (friendships ?? []).map((friendship) =>
    friendship.requester_id === viewerId ? friendship.addressee_id : friendship.requester_id
  );

  if (friendIds.length === 0) return [];

  const [{ data: profiles }, { data: balances }] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_url").in("id", friendIds),
    supabase
      .from("balances")
      .select("user_a, user_b, net_amount, last_activity_at")
      .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`),
  ]);

  const results = friendIds.map((friendId) => {
    const profile = profiles?.find((candidate) => candidate.id === friendId);
    const balanceRow =
      balances?.find(
        (row) =>
          (row.user_a === viewerId && row.user_b === friendId) ||
          (row.user_b === viewerId && row.user_a === friendId)
      ) ?? null;

    return {
      friendId,
      username: profile?.username ?? "Unknown",
      avatarUrl: profile?.avatar_url ?? null,
      balance: getViewerRelativeBalance(viewerId, balanceRow),
      lastActivityAt: balanceRow?.last_activity_at ?? null,
    };
  });

  // Most-recent-transaction-first (docs/tasks/homepage-ui.md, "Open items" —
  // now resolved). A friend with no transactions yet has no last_activity_at
  // at all — those sink to the bottom, tie-broken alphabetically so the
  // order is still deterministic rather than depending on array order.
  results.sort((a, b) => {
    if (a.lastActivityAt && b.lastActivityAt) {
      return b.lastActivityAt.localeCompare(a.lastActivityAt);
    }
    if (a.lastActivityAt) return -1;
    if (b.lastActivityAt) return 1;
    return a.username.localeCompare(b.username);
  });

  return results.map((friend) => ({
    friendId: friend.friendId,
    username: friend.username,
    avatarUrl: friend.avatarUrl,
    balance: friend.balance,
  }));
}
