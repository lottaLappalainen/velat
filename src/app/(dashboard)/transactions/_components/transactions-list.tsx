"use client";

import { useState } from "react";

import { TransactionRow, type TransactionRowData } from "@/app/(dashboard)/_components/transaction-row";
import type { Direction } from "@/app/(dashboard)/_lib/direction";
import { EditTransactionDialog, type EditableTransaction } from "./edit-transaction-dialog";

export type TransactionListItem = {
  row: TransactionRowData;
  friendId: string;
  direction: Direction;
  categoryId: string | null;
};

// Clicking a row opens it in the same editor used to log a transaction
// (edit-transaction-dialog.tsx) instead of navigating away, so a past entry
// can be corrected in place.
export function TransactionsList({ items, viewerId }: { items: TransactionListItem[]; viewerId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingItem = items.find((item) => item.row.id === editingId) ?? null;
  const editingTransaction: EditableTransaction | null = editingItem
    ? {
        id: editingItem.row.id,
        friendId: editingItem.friendId,
        friendUsername: editingItem.row.counterparty?.username ?? "friend",
        name: editingItem.row.name,
        amount: editingItem.row.amount,
        direction: editingItem.direction,
        categoryId: editingItem.categoryId,
      }
    : null;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <button
            key={item.row.id}
            type="button"
            onClick={() => setEditingId(item.row.id)}
            className="block w-full text-left"
          >
            <TransactionRow transaction={item.row} />
          </button>
        ))}
      </ul>

      <EditTransactionDialog
        transaction={editingTransaction}
        viewerId={viewerId}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      />
    </>
  );
}
