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
      .select("user_a, user_b, net_amount")
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
    };
  });

  // Sort order isn't decided yet (docs/tasks/homepage-ui.md, open items) —
  // alphabetical by username chosen as the simplest deterministic default.
  return results.sort((a, b) => a.username.localeCompare(b.username));
}
