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
import { FriendPicker, type FriendOption } from "./friend-picker";

// Same name/amount/direction fields as friends/[friendId]'s debt-form.tsx,
// plus a friend picker since there's no friend already implied by the URL
// here. Not factored into a shared fields component — docs/tasks/
// transactions-ui.md's "Shared code" list only calls out the picker/preset/
// row pieces, not the form itself.
export function AddTransactionForm({ friends, presets }: { friends: FriendOption[]; presets: Preset[] }) {
  const router = useRouter();
  const [friendId, setFriendId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const friendUsername = friends.find((friend) => friend.id === friendId)?.username ?? "them";

  function handlePresetSelect(preset: Preset) {
    setName(preset.name);
    setAmount(String(preset.amount));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!friendId) {
      setError("Choose a friend.");
      return;
    }

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
      <FriendPicker friends={friends} selectedFriendId={friendId} onSelect={setFriendId} />

      <PresetPicker presets={presets} onSelect={handlePresetSelect} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="global-transaction-name">Name</Label>
        <Input
          id="global-transaction-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="global-transaction-amount">Amount</Label>
        <Input
          id="global-transaction-amount"
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
          disabled={!friendId}
          className={cn(
            "rounded-md border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50",
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
          disabled={!friendId}
          className={cn(
            "rounded-md border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50",
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
