import { formatMoney, getViewerRelativeBalance, type BalanceRow } from "@/lib/format";

export function BalanceHeader({
  friendUsername,
  viewerId,
  balanceRow,
}: {
  friendUsername: string;
  viewerId: string;
  balanceRow: BalanceRow | null;
}) {
  const balance = getViewerRelativeBalance(viewerId, balanceRow);

  if (balance.status === "settled") {
    return (
      <div className="rounded-lg bg-muted p-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          You&apos;re settled up with {friendUsername}
        </p>
      </div>
    );
  }

  const isOwedToViewer = balance.status === "owed_to_viewer";

  return (
    <div className={`rounded-lg p-4 text-center ${isOwedToViewer ? "bg-success/10" : "bg-destructive/10"}`}>
      <p className={`text-lg font-semibold ${isOwedToViewer ? "text-success" : "text-destructive"}`}>
        {isOwedToViewer ? "+" : "−"} {formatMoney(balance.amount)}
      </p>
      <p className="text-sm text-muted-foreground">
        {isOwedToViewer ? `${friendUsername} owes you` : `You owe ${friendUsername}`}
      </p>
    </div>
  );
}
