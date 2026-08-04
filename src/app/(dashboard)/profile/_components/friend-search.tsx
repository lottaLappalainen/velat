"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendFriendRequest } from "../actions";

type Relationship = "none" | "accepted" | "pending_sent" | "pending_received" | "other";

type SearchResult = {
  id: string;
  username: string;
  avatar_url: string | null;
  relationship: Relationship;
};

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  none: "Send request",
  accepted: "Friends",
  pending_sent: "Requested",
  pending_received: "Check requests",
  other: "Unavailable",
};

export function FriendSearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // Stale results are simply not rendered below (gated on trimmedQuery
      // length) rather than cleared here — clearing would mean calling
      // setState synchronously in the effect body, which the
      // react-hooks/set-state-in-effect rule flags.
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const supabase = createClient();

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${trimmed}%`)
        .neq("id", currentUserId)
        .limit(10);

      if (!profiles || profiles.length === 0) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      const ids = profiles.map((profile) => profile.id);
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(
          `and(requester_id.eq.${currentUserId},addressee_id.in.(${ids.join(",")})),and(addressee_id.eq.${currentUserId},requester_id.in.(${ids.join(",")}))`
        );

      setResults(
        profiles.map((profile) => {
          const friendship = friendships?.find(
            (f) => f.requester_id === profile.id || f.addressee_id === profile.id
          );

          let relationship: Relationship = "none";
          if (friendship) {
            if (friendship.status === "accepted") {
              relationship = "accepted";
            } else if (friendship.status === "pending") {
              relationship = friendship.requester_id === currentUserId ? "pending_sent" : "pending_received";
            } else {
              relationship = "other";
            }
          }

          return { ...profile, relationship };
        })
      );
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, currentUserId]);

  async function handleSendRequest(addresseeId: string) {
    setSendingId(addresseeId);
    const result = await sendFriendRequest(addresseeId);
    setSendingId(null);

    if (!result.error) {
      setResults((previous) =>
        previous.map((result) =>
          result.id === addresseeId ? { ...result, relationship: "pending_sent" } : result
        )
      );
    }
  }

  const trimmedQuery = query.trim();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">Add a friend</h2>
      <Input
        placeholder="Search by username"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {isSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
      {!isSearching && trimmedQuery.length >= 2 && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No users found.</p>
      )}

      {trimmedQuery.length >= 2 && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((result) => (
            <li key={result.id} className="flex items-center gap-2">
              <Avatar className="size-8">
                {result.avatar_url && <AvatarImage src={result.avatar_url} alt={result.username} />}
                <AvatarFallback>{result.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-foreground">{result.username}</span>
              <Button
                type="button"
                size="sm"
                variant={result.relationship === "none" ? "default" : "outline"}
                disabled={result.relationship !== "none" || sendingId === result.id}
                onClick={() => handleSendRequest(result.id)}
              >
                {sendingId === result.id ? "Sending…" : RELATIONSHIP_LABEL[result.relationship]}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
