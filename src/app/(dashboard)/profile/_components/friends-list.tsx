import Link from "next/link";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { FriendshipProfile } from "../_lib/get-friendships";

// A plain roster, not a balance view — balances stay on Home (see
// docs/tasks/homepage-ui.md). This just answers "who am I friends with"
// without leaving Profile. See docs/tasks/login-profile-ui.md, section 3.
export function FriendsList({ friends }: { friends: FriendshipProfile[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">Friends</h2>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No friends yet — search for someone below to add your first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {friends.map((friend) => (
            <li key={friend.friendshipId}>
              <Link href={`/friends/${friend.id}`} className="flex items-center gap-2">
                <Avatar className="size-8">
                  {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.username} />}
                  <AvatarFallback>{friend.username[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-foreground">{friend.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
