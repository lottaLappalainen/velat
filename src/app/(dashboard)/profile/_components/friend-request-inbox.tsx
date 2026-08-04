import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { respondToFriendRequest } from "../actions";

type IncomingRequest = {
  id: string;
  requester: { id: string; username: string; avatar_url: string | null } | null;
};

export function FriendRequestInbox({ requests }: { requests: IncomingRequest[] }) {
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
            <li key={request.id} className="flex items-center gap-2">
              <Avatar className="size-8">
                {request.requester?.avatar_url && (
                  <AvatarImage src={request.requester.avatar_url} alt={request.requester.username} />
                )}
                <AvatarFallback>{request.requester?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-foreground">
                {request.requester?.username ?? "Unknown user"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await respondToFriendRequest(request.id, true);
                }}
              >
                <Button type="submit" size="sm">
                  Accept
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await respondToFriendRequest(request.id, false);
                }}
              >
                <Button type="submit" size="sm" variant="outline">
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
