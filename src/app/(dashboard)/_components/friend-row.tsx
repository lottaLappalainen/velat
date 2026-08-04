import Link from "next/link";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toneTextClass } from "@/components/ui/callout";
import { cn } from "@/lib/utils";
import { formatMoney, getBalanceTone } from "@/lib/format";
import type { FriendBalance } from "../_lib/get-friend-balances";

export function FriendRow({ friend }: { friend: FriendBalance }) {
  const { balance } = friend;

  const line =
    balance.status === "settled"
      ? "You're settled up"
      : balance.status === "owed_to_viewer"
        ? `${friend.username} owes you ${formatMoney(balance.amount)}`
        : `You owe ${friend.username} ${formatMoney(balance.amount)}`;

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
        <span className={cn("text-sm", toneTextClass(getBalanceTone(balance.status)))}>{line}</span>
      </div>
    </Link>
  );
}
