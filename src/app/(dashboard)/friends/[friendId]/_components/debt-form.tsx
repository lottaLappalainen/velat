"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PresetPicker } from "@/app/(dashboard)/_components/preset-picker";
import { createTransaction, savePreset, type Direction } from "@/app/(dashboard)/_lib/transaction-actions";
import type { Preset } from "@/app/(dashboard)/_lib/get-presets";

// Name/amount/direction fields per docs/tasks/debt-ledger.md — the segmented
// control has no default selection and pairs color + glyph + text together
// (not color alone), so direction can never be submitted ambiguously.
export function DebtForm({
  friendId,
  friendUsername,
  presets,
}: {
  friendId: string;
  friendUsername: string;
  presets: Preset[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handlePresetSelect(preset: Preset) {
    setName(preset.name);
    setAmount(String(preset.amount));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parsedAmount = Number(amount);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!(parsedAmount > 0)) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!direction) {
      setError("Choose a direction.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTransaction(friendId, {
        name: trimmedName,
        amount: parsedAmount,
        direction,
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transaction-name">Name</Label>
        <Input
          id="transaction-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transaction-amount">Amount</Label>
        <Input
          id="transaction-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Direction">
        <button
          type="button"
          role="radio"
          aria-checked={direction === "owed_to_me"}
          onClick={() => setDirection("owed_to_me")}
          className={cn(
            "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
            direction === "owed_to_me"
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted-foreground"
          )}
        >
          + {friendUsername} owes me
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={direction === "i_owe"}
          onClick={() => setDirection("i_owe")}
          className={cn(
            "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
            direction === "i_owe"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground"
          )}
        >
          − I owe {friendUsername}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={saveAsPreset}
          onChange={(event) => setSaveAsPreset(event.target.checked)}
          className="size-4 rounded border-input"
        />
        Save as preset
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add transaction"}
      </Button>
    </form>
  );
}
