"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { deletePreset } from "../_lib/transaction-actions";
import type { Preset } from "../_lib/get-presets";

// A row of tappable name+amount shortcuts above the Name/Amount fields —
// see docs/tasks/debt-ledger.md, "Saved presets." Tapping a chip fills the
// form (still editable after); Direction is never implied by a preset.
export function PresetPicker({
  presets,
  onSelect,
}: {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  async function handleDelete(presetId: string) {
    setDeletingId(presetId);
    const result = await deletePreset(presetId);
    setDeletingId(null);
    if (!result.error) {
      setHiddenIds((previous) => new Set(previous).add(presetId));
    }
  }

  const visiblePresets = presets.filter((preset) => !hiddenIds.has(preset.id));
  if (visiblePresets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visiblePresets.map((preset) => (
        <div
          key={preset.id}
          className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pr-1 pl-3 text-sm"
        >
          <button
            type="button"
            onClick={() => onSelect(preset)}
            className="text-foreground"
          >
            {preset.name} · {formatMoney(preset.amount, preset.currency)}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete preset ${preset.name}`}
            disabled={deletingId === preset.id}
            onClick={() => handleDelete(preset.id)}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
