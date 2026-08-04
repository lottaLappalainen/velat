"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type FriendOption = { id: string; username: string; avatarUrl: string | null };

// Scoped to accepted friends only — RLS would reject a transaction against
// anyone else, so offering them here would just invite a guaranteed-fail
// submit. See docs/tasks/transactions-ui.md.
export function FriendPicker({
  friends,
  selectedFriendId,
  onSelect,
}: {
  friends: FriendOption[];
  selectedFriendId: string | null;
  onSelect: (friendId: string | null) => void;
}) {
  const [query, setQuery] = useState("");

  const selected = friends.find((friend) => friend.id === selectedFriendId) ?? null;

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return friends;
    return friends.filter((friend) => friend.username.toLowerCase().includes(trimmed));
  }, [friends, query]);

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt={selected.username} />}
          <AvatarFallback>{selected.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm font-medium text-foreground">{selected.username}</span>
        <Button type="button" variant="tertiary" size="sm" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Search friends" value={query} onChange={(event) => setQuery(event.target.value)} />
      <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {matches.length === 0 && <li className="text-xs text-muted-foreground">No friends match.</li>}
        {matches.map((friend) => (
          <li key={friend.id}>
            <button
              type="button"
              onClick={() => onSelect(friend.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            >
              <Avatar className="size-6">
                {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.username} />}
                <AvatarFallback className="text-xs">{friend.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{friend.username}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
