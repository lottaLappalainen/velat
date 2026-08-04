"use client";

import { cn } from "@/lib/utils";
import type { Tone } from "./callout";

const TONE_ACTIVE_CLASS: Record<Tone, string> = {
  success: "border-success bg-success/10 text-success",
  destructive: "border-destructive bg-destructive/10 text-destructive",
  muted: "border-foreground bg-muted text-foreground",
};

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  tone: Tone;
};

// A required, explicit-choice toggle between mutually exclusive options — no
// option is ever pre-selected, so nothing can be submitted by accident via a
// leftover default. See docs/tasks/debt-ledger.md's direction control, the
// reason this exists, and docs/DESIGN_SYSTEM.md for the tone vocabulary.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
}: {
  options: SegmentedControlOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            value === option.value ? TONE_ACTIVE_CLASS[option.tone] : "border-border text-muted-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
