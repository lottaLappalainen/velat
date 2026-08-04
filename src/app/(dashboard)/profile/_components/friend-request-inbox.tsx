import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { respondToFriendRequest } from "../actions";
import type { FriendshipProfile } from "../_lib/get-friendships";

export function FriendRequestInbox({ requests }: { requests: FriendshipProfile[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">Friend requests</h2>

      {requests.length === 0 ? (
        // Explicit empty state, not nothing — on mobile that's the only way
        // to tell "loaded, empty" apart from "still loading."
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li key={request.friendshipId} className="flex items-center gap-2">
              <Avatar className="size-8">
                {request.avatarUrl && <AvatarImage src={request.avatarUrl} alt={request.username} />}
                <AvatarFallback>{request.username[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-foreground">{request.username}</span>
              <form
                action={async () => {
                  "use server";
                  await respondToFriendRequest(request.friendshipId, true);
                }}
              >
                <Button type="submit" size="sm">
                  Accept
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await respondToFriendRequest(request.friendshipId, false);
                }}
              >
                <Button type="submit" size="sm" variant="secondary">
                  Decline
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
