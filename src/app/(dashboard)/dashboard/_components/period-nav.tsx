import Link from "next/link";

import { cn } from "@/lib/utils";
import { periodParamForMode, type PeriodMode, type ResolvedPeriod } from "../_lib/resolve-period";

const MODES: { mode: PeriodMode; label: string }[] = [
  { mode: "month", label: "Month" },
  { mode: "year", label: "Year" },
  { mode: "all", label: "All time" },
];

// Entirely <Link>-driven — no client component, no JS state. Navigating
// between periods is just a different `?period=` URL, same reasoning as
// docs/tasks/categories-dashboard.md, "Period selection — URL-driven."
export function PeriodNav({ period }: { period: ResolvedPeriod }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {period.mode !== "all" ? (
          <Link
            href={`/dashboard?period=${period.previousParamValue}`}
            aria-label="Previous period"
            className="text-lg text-muted-foreground hover:text-foreground"
          >
            ‹
          </Link>
        ) : (
          <span className="w-4" />
        )}

        <span className="text-sm font-semibold text-foreground">{period.label}</span>

        {period.mode !== "all" ? (
          <Link
            href={`/dashboard?period=${period.nextParamValue}`}
            aria-label="Next period"
            className="text-lg text-muted-foreground hover:text-foreground"
          >
            ›
          </Link>
        ) : (
          <span className="w-4" />
        )}
      </div>

      <div className="flex gap-2">
        {MODES.map(({ mode, label }) => (
          <Link
            key={mode}
            href={`/dashboard?period=${periodParamForMode(period, mode)}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              period.mode === mode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
