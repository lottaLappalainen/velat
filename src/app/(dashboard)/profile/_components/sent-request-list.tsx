import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { FriendshipProfile } from "../_lib/get-friendships";

// "Waiting on them" — deliberately inert, the opposite treatment from
// FriendsList/FriendRequestInbox: lower opacity, muted text, no
// hover/pointer affordance, no button. There's nothing to do here, just
// confirmation the request went through. No cancel action yet — see
// docs/tasks/login-profile-ui.md, section 5 and its Open items.
//
// Unlike the other two lists, an empty state here collapses away instead of
// showing a placeholder message — an empty "sent requests" list isn't a
// state the viewer needs confirmed.
export function SentRequestList({ requests }: { requests: FriendshipProfile[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">Sent requests</h2>
      <ul className="flex flex-col gap-2 opacity-60">
        {requests.map((request) => (
          <li key={request.friendshipId} className="flex cursor-default items-center gap-2">
            <Avatar className="size-8">
              {request.avatarUrl && <AvatarImage src={request.avatarUrl} alt={request.username} />}
              <AvatarFallback>{request.username[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm text-muted-foreground">{request.username}</span>
            <span className="text-xs text-muted-foreground">Waiting…</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
