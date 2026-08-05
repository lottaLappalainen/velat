"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PresetPicker } from "@/app/(dashboard)/_components/preset-picker";
import { CategoryPicker } from "@/app/(dashboard)/_components/category-picker";
import { AmountInput } from "@/app/(dashboard)/_components/amount-input";
import { createTransaction, savePreset, type Direction } from "@/app/(dashboard)/_lib/transaction-actions";
import { resolveParticipants } from "@/app/(dashboard)/_lib/direction";
import type { Preset } from "@/app/(dashboard)/_lib/get-presets";
import { evaluateAmountExpression } from "@/lib/calc";
import { FriendPicker, type FriendOption } from "./friend-picker";

// Same name/amount/direction fields as friends/[friendId]'s debt-form.tsx,
// plus a friend picker since there's no friend already implied by the URL
// here. Not factored into a shared fields component — docs/tasks/
// transactions-ui.md's "Shared code" list only calls out the picker/preset/
// row pieces, not the form itself. All styling comes from shared ui/
// primitives — see docs/DESIGN_SYSTEM.md.
export function AddTransactionForm({
  friends,
  presets,
  viewerId,
}: {
  friends: FriendOption[];
  presets: Preset[];
  viewerId: string;
}) {
  const router = useRouter();
  const [friendId, setFriendId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const friendUsername = friends.find((friend) => friend.id === friendId)?.username ?? "them";

  // Only resolvable once both a friend and a direction are chosen — see
  // docs/tasks/categories-dashboard.md, "whose category is it?"
  const debtorId =
    friendId && direction ? resolveParticipants(viewerId, friendId, direction).debtorId : null;

  function handleFriendChange(next: string | null) {
    setFriendId(next);
    setDirection(null);
    setCategoryId(null);
  }

  function handleDirectionChange(next: Direction) {
    setDirection(next);
    setCategoryId(null);
  }

  function handlePresetSelect(preset: Preset) {
    setName(preset.name);
    setAmount(String(preset.amount).replace(".", ","));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!friendId) {
      setError("Choose a friend.");
      return;
    }

    const trimmedName = name.trim();
    const parsedAmount = evaluateAmountExpression(amount);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (parsedAmount === null || !(parsedAmount > 0)) {
      setError("Amount must be greater than zero.");
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

    setIsSubmitting(true);

    try {
      const result = await createTransaction(friendId, {
        name: trimmedName,
        amount: parsedAmount,
        direction,
        categoryId,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (saveAsPreset) {
        await savePreset(trimmedName, parsedAmount);
      }

      setName("");
      setAmount("");
      setDirection(null);
      setCategoryId(null);
      setSaveAsPreset(false);
      setFriendId(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <FriendPicker friends={friends} selectedFriendId={friendId} onSelect={handleFriendChange} />

      <PresetPicker presets={presets} onSelect={handlePresetSelect} />

      <Field>
        <FieldLabel htmlFor="global-transaction-name">Name</FieldLabel>
        <Input
          id="global-transaction-name"
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
        disabled={!friendId}
        options={[
          { value: "owed_to_me", label: `+ ${friendUsername} owes me`, tone: "success" },
          { value: "i_owe", label: `− I owe ${friendUsername}`, tone: "destructive" },
        ]}
      />

      <CategoryPicker debtorId={debtorId} selectedCategoryId={categoryId} onSelect={setCategoryId} />

      <Field orientation="horizontal">
        <Checkbox id="global-save-as-preset" checked={saveAsPreset} onCheckedChange={setSaveAsPreset} />
        <FieldLabel htmlFor="global-save-as-preset">Save as preset</FieldLabel>
      </Field>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add transaction"}
      </Button>
    </form>
  );
}
