import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The single place tone → color is decided for any colored status box or
// status text in the app. See docs/DESIGN_SYSTEM.md.
export type Tone = "success" | "destructive" | "muted";

const TONE_TEXT_CLASS: Record<Tone, string> = {
  success: "text-success",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export function toneTextClass(tone: Tone): string {
  return TONE_TEXT_CLASS[tone];
}

// A stronger, decorative tint (e.g. a pulsing glow layer) — deliberately a
// separate scale from Callout's own bg-*/10, not reused at the same opacity.
const TONE_GLOW_CLASS: Record<Tone, string> = {
  success: "bg-success/15",
  destructive: "bg-destructive/15",
  muted: "bg-muted",
};

export function toneGlowClass(tone: Tone): string {
  return TONE_GLOW_CLASS[tone];
}

const calloutVariants = cva("rounded-lg p-4 text-center", {
  variants: {
    tone: {
      success: "bg-success/10 text-success",
      destructive: "bg-destructive/10 text-destructive",
      muted: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

// A tone-colored box for a single piece of status info (a balance, a total).
// Children that want the tone color inherit it automatically; a child that
// needs to stay neutral (e.g. a label above the amount) sets its own
// text-muted-foreground to override — see balance-header.tsx / totals-
// header.tsx for the pattern.
function Callout({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  return <div data-slot="callout" className={cn(calloutVariants({ tone }), className)} {...props} />;
}

export { Callout, calloutVariants };
