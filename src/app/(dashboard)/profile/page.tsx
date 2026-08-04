import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";
import { getFriends, getSentRequests, getIncomingRequests } from "./_lib/get-friendships";
import { AvatarUploader } from "./_components/avatar-uploader";
import { UsernameForm } from "./_components/username-form";
import { PasswordForm } from "./_components/password-form";
import { FriendsList } from "./_components/friends-list";
import { FriendSearch } from "./_components/friend-search";
import { SentRequestList } from "./_components/sent-request-list";
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

  const [friends, sentRequests, incomingRequests] = await Promise.all([
    getFriends(supabase, userId),
    getSentRequests(supabase, userId),
    getIncomingRequests(supabase, userId),
  ]);

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>

      <section className="flex flex-col gap-4">
        <AvatarUploader avatarUrl={profile?.avatar_url ?? null} username={profile?.username ?? ""} />
        <UsernameForm currentUsername={profile?.username ?? ""} />
      </section>

      <PasswordForm />

      <FriendsList friends={friends} />

      <FriendSearch currentUserId={userId} />

      <SentRequestList requests={sentRequests} />

      <FriendRequestInbox requests={incomingRequests} />

      <form action={logout}>
        <Button type="submit" variant="secondary" size="sm">
          Log out
        </Button>
      </form>
    </div>
  );
}
