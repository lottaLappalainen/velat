"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryPicker } from "@/app/(dashboard)/_components/category-picker";
import { AmountInput } from "@/app/(dashboard)/_components/amount-input";
import { updateTransaction, deleteTransaction } from "@/app/(dashboard)/_lib/transaction-actions";
import { resolveParticipants, type Direction } from "@/app/(dashboard)/_lib/direction";
import { evaluateAmountExpression } from "@/lib/calc";

export type EditableTransaction = {
  id: string;
  friendId: string;
  friendUsername: string;
  name: string;
  amount: number;
  direction: Direction;
  categoryId: string | null;
};

// Same name/amount/direction/category fields as add-transaction-form.tsx,
// reused here for editing a past entry rather than logging a new one — see
// updateTransaction in _lib/transaction-actions.ts. Rendered in a Dialog
// (dismissible, unlike the destructive-confirmation AlertDialog used for
// preset deletion) so the transactions list stays behind it.
export function EditTransactionDialog({
  transaction,
  viewerId,
  onOpenChange,
}: {
  transaction: EditableTransaction | null;
  viewerId: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={transaction !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {transaction && (
          <EditTransactionForm
            key={transaction.id}
            transaction={transaction}
            viewerId={viewerId}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// What's awaiting confirmation in the AlertDialog below — "save" carries the
// already-validated field values so the confirm step doesn't re-validate,
// "delete" needs no payload beyond the transaction itself.
type PendingConfirm =
  | { type: "save"; name: string; amount: number; direction: Direction; categoryId: string }
  | { type: "delete" };

function EditTransactionForm({
  transaction,
  viewerId,
  onSaved,
}: {
  transaction: EditableTransaction;
  viewerId: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(transaction.name);
  const [amount, setAmount] = useState(String(transaction.amount).replace(".", ","));
  const [direction, setDirection] = useState<Direction | null>(transaction.direction);
  const [categoryId, setCategoryId] = useState<string | null>(transaction.categoryId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const debtorId = direction ? resolveParticipants(viewerId, transaction.friendId, direction).debtorId : null;

  function handleDirectionChange(next: Direction) {
    setDirection(next);
    setCategoryId(null);
  }

  // Validates and, if the fields check out, hands off to the confirmation
  // dialog rather than saving directly — actually saving happens in
  // performSave, once the user confirms.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parsedAmount = evaluateAmountExpression(amount);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (parsedAmount === null || parsedAmount < 0) {
      setError("Amount can't be negative.");
      return;
    }
    if (!direction) {
      setError("Choose a direction.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }

    setPendingConfirm({ type: "save", name: trimmedName, amount: parsedAmount, direction, categoryId });
  }

  async function performSave(input: { name: string; amount: number; direction: Direction; categoryId: string }) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateTransaction(transaction.id, transaction.friendId, input);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function performDelete() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteTransaction(transaction.id, transaction.friendId);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConfirm() {
    if (pendingConfirm?.type === "save") {
      performSave(pendingConfirm);
    } else if (pendingConfirm?.type === "delete") {
      performDelete();
    }
    setPendingConfirm(null);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>With {transaction.friendUsername}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="edit-transaction-name">Name</FieldLabel>
          <Input
            id="edit-transaction-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel>Amount</FieldLabel>
          <AmountInput value={amount} onChange={setAmount} />
        </Field>

        <SegmentedControl
          ariaLabel="Direction"
          value={direction}
          onChange={handleDirectionChange}
          options={[
            { value: "owed_to_me", label: `+ ${transaction.friendUsername} owes me`, tone: "success" },
            { value: "i_owe", label: `− I owe ${transaction.friendUsername}`, tone: "destructive" },
          ]}
        />

        <CategoryPicker debtorId={debtorId} selectedCategoryId={categoryId} onSelect={setCategoryId} />

        <FieldError>{error}</FieldError>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>

        <Button
          type="button"
          variant="destructive"
          disabled={isSubmitting}
          onClick={() => setPendingConfirm({ type: "delete" })}
        >
          Delete transaction
        </Button>
      </form>

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingConfirm?.type === "delete" ? "Delete transaction?" : "Save changes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirm?.type === "delete"
                ? `"${transaction.name}" with ${transaction.friendUsername} will be gone for good.`
                : `This updates "${transaction.name}" with ${transaction.friendUsername}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingConfirm?.type === "delete" ? "destructive" : "primary"}
              onClick={handleConfirm}
            >
              {pendingConfirm?.type === "delete" ? "Delete" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
