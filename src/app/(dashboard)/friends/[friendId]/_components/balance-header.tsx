import { Callout } from "@/components/ui/callout";
import { formatMoney, getBalanceTone, getViewerRelativeBalance, type BalanceRow } from "@/lib/format";

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
  const tone = getBalanceTone(balance.status);

  if (balance.status === "settled") {
    return (
      <Callout tone={tone}>
        <p className="text-sm font-medium">You&apos;re settled up with {friendUsername}</p>
      </Callout>
    );
  }

  const isOwedToViewer = balance.status === "owed_to_viewer";

  return (
    <Callout tone={tone}>
      <p className="text-lg font-semibold">
        {isOwedToViewer ? "+" : "−"} {formatMoney(balance.amount)}
      </p>
      <p className="text-sm text-muted-foreground">
        {isOwedToViewer ? `${friendUsername} owes you` : `You owe ${friendUsername}`}
      </p>
    </Callout>
  );
}
