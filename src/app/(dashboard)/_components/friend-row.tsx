import Link from "next/link";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/format";
import type { FriendBalance } from "../_lib/get-friend-balances";

export function FriendRow({ friend }: { friend: FriendBalance }) {
  const { balance } = friend;

  let line: string;
  let colorClass: string;
  if (balance.status === "settled") {
    line = "You're settled up";
    colorClass = "text-muted-foreground";
  } else if (balance.status === "owed_to_viewer") {
    line = `${friend.username} owes you ${formatMoney(balance.amount)}`;
    colorClass = "text-success";
  } else {
    line = `You owe ${friend.username} ${formatMoney(balance.amount)}`;
    colorClass = "text-destructive";
  }

  return (
    <Link
      href={`/friends/${friend.friendId}`}
      className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
    >
      <Avatar className="size-10">
        {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.username} />}
        <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{friend.username}</span>
        <span className={`text-sm ${colorClass}`}>{line}</span>
      </div>
    </Link>
  );
}
