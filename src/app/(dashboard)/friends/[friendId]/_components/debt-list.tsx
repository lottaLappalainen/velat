import { TransactionRow, type TransactionRowData } from "@/app/(dashboard)/_components/transaction-row";

type RawTransaction = {
  id: string;
  creditor_id: string;
  debtor_id: string;
  amount: number;
  currency: string;
  name: string;
  created_by: string;
  created_at: string;
};

export function DebtList({
  transactions,
  viewerId,
  friendUsername,
}: {
  transactions: RawTransaction[];
  viewerId: string;
  friendUsername: string;
}) {
  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions yet.</p>;
  }

  const rows: TransactionRowData[] = transactions.map((transaction) => ({
    id: transaction.id,
    name: transaction.name,
    amount: transaction.amount,
    currency: transaction.currency,
    createdAt: transaction.created_at,
    isOwedToViewer: transaction.creditor_id === viewerId,
    addedByUsername: transaction.created_by === viewerId ? "You" : friendUsername,
  }));

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <TransactionRow key={row.id} transaction={row} />
      ))}
    </ul>
  );
}
