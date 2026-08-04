import { formatMoney } from "@/lib/format";
import type { FriendBalance } from "../_lib/get-friend-balances";

// Two independent totals, never netted against each other — owing Alice and
// being owed by Bob don't cancel out. See docs/tasks/homepage-ui.md.
export function TotalsHeader({ friendBalances }: { friendBalances: FriendBalance[] }) {
  const totals = friendBalances.reduce(
    (acc, friend) => {
      if (friend.balance.status === "owed_to_viewer") acc.owedToViewer += friend.balance.amount;
      if (friend.balance.status === "owed_by_viewer") acc.owedByViewer += friend.balance.amount;
      return acc;
    },
    { owedToViewer: 0, owedByViewer: 0 }
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-success/10 p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground">You are owed</p>
        <p className="text-lg font-semibold text-success">+ {formatMoney(totals.owedToViewer)}</p>
      </div>
      <div className="rounded-lg bg-destructive/10 p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground">You owe</p>
        <p className="text-lg font-semibold text-destructive">− {formatMoney(totals.owedByViewer)}</p>
      </div>
    </div>
  );
}
