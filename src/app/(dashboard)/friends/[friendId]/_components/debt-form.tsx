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

// Name/amount/direction fields per docs/tasks/debt-ledger.md — the segmented
// control has no default selection, so direction can never be submitted
// ambiguously. All styling here comes from shared ui/ primitives — see
// docs/DESIGN_SYSTEM.md.
export function DebtForm({
  friendId,
  friendUsername,
  viewerId,
  presets,
}: {
  friendId: string;
  friendUsername: string;
  viewerId: string;
  presets: Preset[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Whose category list applies — see docs/tasks/categories-dashboard.md,
  // "whose category is it?" Resetting categoryId when the debtor changes
  // (not just on direction change) keeps this correct even though, on this
  // page, friendId never changes — direction is the only thing that moves it.
  const debtorId = direction ? resolveParticipants(viewerId, friendId, direction).debtorId : null;

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
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <PresetPicker presets={presets} onSelect={handlePresetSelect} />

      <Field>
        <FieldLabel htmlFor="transaction-name">Name</FieldLabel>
        <Input id="transaction-name" value={name} onChange={(event) => setName(event.target.value)} required />
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
          { value: "owed_to_me", label: `+ ${friendUsername} owes me`, tone: "success" },
          { value: "i_owe", label: `− I owe ${friendUsername}`, tone: "destructive" },
        ]}
      />

      <CategoryPicker debtorId={debtorId} selectedCategoryId={categoryId} onSelect={setCategoryId} />

      <Field orientation="horizontal">
        <Checkbox id="save-as-preset" checked={saveAsPreset} onCheckedChange={setSaveAsPreset} />
        <FieldLabel htmlFor="save-as-preset">Save as preset</FieldLabel>
      </Field>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add transaction"}
      </Button>
    </form>
  );
}
