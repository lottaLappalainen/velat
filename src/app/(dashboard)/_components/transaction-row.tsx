import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toneTextClass } from "@/components/ui/callout";
import { cn } from "@/lib/utils";
import { formatMoney, formatFinnishDateTime } from "@/lib/format";

export type TransactionRowData = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  createdAt: string;
  isOwedToViewer: boolean;
  addedByUsername: string;
  // Only set on the global /transactions log — omitted on /friends/[friendId]
  // where the counterparty is already implied by the page, per
  // docs/tasks/transactions-ui.md.
  counterparty?: { username: string; avatarUrl: string | null };
};

export function TransactionRow({ transaction }: { transaction: TransactionRowData }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {transaction.counterparty && (
        <Avatar className="size-8">
          {transaction.counterparty.avatarUrl && (
            <AvatarImage src={transaction.counterparty.avatarUrl} alt={transaction.counterparty.username} />
          )}
          <AvatarFallback>{transaction.counterparty.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.name}
          {transaction.counterparty && (
            <span className="font-normal text-muted-foreground"> · {transaction.counterparty.username}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFinnishDateTime(transaction.createdAt)} · added by {transaction.addedByUsername}
        </p>
      </div>

      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          toneTextClass(transaction.isOwedToViewer ? "success" : "destructive")
        )}
      >
        {transaction.isOwedToViewer ? "+" : "−"} {formatMoney(transaction.amount, transaction.currency)}
      </span>
    </li>
  );
}
