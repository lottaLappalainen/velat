import type { createClient } from "@/lib/supabase/server";

// Backs the three list sections on the Profile page — see
// docs/tasks/login-profile-ui.md. All three are the same shape (a
// friendships row filtered differently, joined to the other person's
// profile), so they're colocated here rather than tripling the
// fetch-then-merge logic across three components.
export type FriendshipProfile = {
  friendshipId: string;
  id: string;
  username: string;
  avatarUrl: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function profilesById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
  return data ?? [];
}

function toFriendshipProfile(
  friendshipId: string,
  otherId: string,
  profiles: { id: string; username: string; avatar_url: string | null }[]
): FriendshipProfile {
  const profile = profiles.find((candidate) => candidate.id === otherId);
  return {
    friendshipId,
    id: otherId,
    username: profile?.username ?? "Unknown",
    avatarUrl: profile?.avatar_url ?? null,
  };
}

// Friends (section 3): accepted, viewer on either side. Plain roster, no
// balances — those stay on Home (see homepage-ui.md).
export async function getFriends(supabase: SupabaseClient, viewerId: string): Promise<FriendshipProfile[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);

  const rows = friendships ?? [];
  const otherIds = rows.map((row) => (row.requester_id === viewerId ? row.addressee_id : row.requester_id));
  const profiles = await profilesById(supabase, otherIds);

  return rows
    .map((row) =>
      toFriendshipProfile(
        row.id,
        row.requester_id === viewerId ? row.addressee_id : row.requester_id,
        profiles
      )
    )
    .sort((a, b) => a.username.localeCompare(b.username));
}

// Sent requests (section 5): pending, viewer is the requester — "waiting on
// them," lighter/disabled styling, no action available.
export async function getSentRequests(supabase: SupabaseClient, viewerId: string): Promise<FriendshipProfile[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, addressee_id")
    .eq("status", "pending")
    .eq("requester_id", viewerId);

  const rows = friendships ?? [];
  const profiles = await profilesById(supabase, rows.map((row) => row.addressee_id));

  return rows.map((row) => toFriendshipProfile(row.id, row.addressee_id, profiles));
}

// Incoming requests (section 6): pending, viewer is the addressee — Accept /
// Decline lives here.
export async function getIncomingRequests(
  supabase: SupabaseClient,
  viewerId: string
): Promise<FriendshipProfile[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, requester_id")
    .eq("status", "pending")
    .eq("addressee_id", viewerId);

  const rows = friendships ?? [];
  const profiles = await profilesById(supabase, rows.map((row) => row.requester_id));

  return rows.map((row) => toFriendshipProfile(row.id, row.requester_id, profiles));
}
