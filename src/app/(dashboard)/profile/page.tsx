import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";
import { AvatarUploader } from "./_components/avatar-uploader";
import { UsernameForm } from "./_components/username-form";
import { PasswordForm } from "./_components/password-form";
import { FriendSearch } from "./_components/friend-search";
import { FriendRequestInbox } from "./_components/friend-request-inbox";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Belt-and-suspenders — src/proxy.ts already redirects unauthenticated
  // requests before this page renders (see docs/tasks/authorization.md).
  if (!claims) {
    redirect("/login");
  }

  const userId = claims.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .single();

  const { data: pendingRequests } = await supabase
    .from("friendships")
    .select("id, requester_id")
    .eq("addressee_id", userId)
    .eq("status", "pending");

  const requesterIds = (pendingRequests ?? []).map((request) => request.requester_id);
  const { data: requesterProfiles } = requesterIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", requesterIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null }[] };

  const incomingRequests = (pendingRequests ?? []).map((request) => ({
    id: request.id,
    requester: requesterProfiles?.find((candidate) => candidate.id === request.requester_id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>

      <section className="flex flex-col gap-4">
        <AvatarUploader avatarUrl={profile?.avatar_url ?? null} username={profile?.username ?? ""} />
        <UsernameForm currentUsername={profile?.username ?? ""} />
      </section>

      <PasswordForm />

      <FriendSearch currentUserId={userId} />

      <FriendRequestInbox requests={incomingRequests} />

      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          Log out
        </Button>
      </form>
    </div>
  );
}
