"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
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
import { AmountInput } from "@/app/(dashboard)/_components/amount-input";
import { savePreset, deletePreset } from "@/app/(dashboard)/_lib/transaction-actions";
import type { Preset } from "@/app/(dashboard)/_lib/get-presets";
import { formatMoney } from "@/lib/format";
import { evaluateAmountExpression } from "@/lib/calc";

// Standalone create/delete surface for presets, separate from PresetPicker
// (which only selects+deletes inline on a transaction form). Presets are
// owner-only in every direction — never shared with a friend — so Profile
// is the natural home for managing the full set.
export function PresetManager({ initialPresets }: { initialPresets: Preset[] }) {
  const [presets, setPresets] = useState(initialPresets);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingPreset, setConfirmingPreset] = useState<Preset | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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

    setIsSaving(true);
    const result = await savePreset(trimmedName, parsedAmount);
    setIsSaving(false);

    if (result.error || !result.preset) {
      setError(result.error ?? "Couldn't save preset.");
      return;
    }

    setPresets((previous) => [result.preset!, ...previous]);
    setName("");
    setAmount("");
  }

  async function handleDelete(presetId: string) {
    setDeletingId(presetId);
    const result = await deletePreset(presetId);
    setDeletingId(null);
    if (!result.error) {
      setPresets((previous) => previous.filter((preset) => preset.id !== presetId));
    }
  }

  return (
    <CollapsibleSection title="Presets">
      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No presets yet — add one below.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pr-1 pl-3 text-sm"
            >
              <span className="text-foreground">
                {preset.name} · {formatMoney(preset.amount, preset.currency)}
              </span>
              <Button
                type="button"
                variant="tertiary"
                size="icon-xs"
                aria-label={`Delete preset ${preset.name}`}
                disabled={deletingId === preset.id}
                onClick={() => setConfirmingPreset(preset)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="preset-name">Name</FieldLabel>
          <Input id="preset-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Amount</FieldLabel>
          <AmountInput value={amount} onChange={setAmount} />
        </Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>
          {isSaving ? "Adding…" : "Add preset"}
        </Button>
      </form>

      <AlertDialog
        open={confirmingPreset !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingPreset(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preset?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingPreset && (
                <>
                  “{confirmingPreset.name} · {formatMoney(confirmingPreset.amount, confirmingPreset.currency)}”
                  will be gone for good — this doesn&apos;t affect any transactions you already logged with it.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmingPreset) handleDelete(confirmingPreset.id);
                setConfirmingPreset(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CollapsibleSection>
  );
}