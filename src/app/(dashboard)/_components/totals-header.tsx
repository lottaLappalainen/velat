"use client";

import { useEffect, useRef, useState } from "react";

import { Callout, toneGlowClass, type Tone } from "@/components/ui/callout";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FriendBalance } from "../_lib/get-friend-balances";

// Two independent totals, never netted against each other — owing Alice and
// being owed by Bob don't cancel out. See docs/tasks/homepage-ui.md.
//
// This is the hero of the page (big type, emoji, motion), not a quiet stat
// tile — see homepage-ui.md, "Totals header" for the full spec and the
// reasoning behind each piece below.

// Counts from whatever it last showed up to `target`, easing out — used both
// for the initial reveal and for later changes (e.g. after logging a new
// transaction), so the number always visibly moves rather than jump-cutting.
// Respects prefers-reduced-motion: jumps straight to `target`, no animation.
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Skip the animation for the very first render and whenever the OS says
    // to — both just jump straight to the target, resolved as a single
    // rAF-driven "frame" below rather than a synchronous setState here.
    const effectiveDuration = isFirstRun.current || prefersReducedMotion ? 0 : durationMs;
    isFirstRun.current = false;

    const from = fromRef.current;
    const startTime = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = effectiveDuration === 0 ? 1 : Math.min((now - startTime) / effectiveDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function TotalTile({
  label,
  glyph,
  emoji,
  calmEmoji,
  tone,
  amount,
}: {
  label: string;
  glyph: "+" | "−";
  emoji: string;
  calmEmoji: string;
  tone: Extract<Tone, "success" | "destructive">;
  amount: number;
}) {
  const animated = useCountUp(amount);
  const isZero = amount === 0;

  return (
    <Callout tone={tone} className="relative overflow-hidden py-7">
      {!isZero && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 animate-pulse motion-reduce:animate-none",
            toneGlowClass(tone)
          )}
        />
      )}
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 flex items-center justify-center gap-3 text-5xl font-bold tabular-nums sm:text-6xl">
        <span>
          {glyph} {formatMoney(animated)}
        </span>
        <span
          aria-hidden
          className={cn(
            "text-4xl sm:text-5xl",
            !isZero && "animate-[float_2.5s_ease-in-out_infinite] motion-reduce:animate-none"
          )}
        >
          {isZero ? calmEmoji : emoji}
        </span>
      </p>
    </Callout>
  );
}

export function TotalsHeader({ friendBalances }: { friendBalances: FriendBalance[] }) {
  const totals = friendBalances.reduce(
    (acc, friend) => {
      if (friend.balance.status === "owed_to_viewer") acc.owedToViewer += friend.balance.amount;
      if (friend.balance.status === "owed_by_viewer") acc.owedByViewer += friend.balance.amount;
      return acc;
    },
    { owedToViewer: 0, owedByViewer: 0 }
  );

  return (
    <div className="flex flex-col gap-3">
      <TotalTile
        label="You are owed"
        glyph="+"
        emoji="🤑"
        calmEmoji="😌"
        tone="success"
        amount={totals.owedToViewer}
      />
      <TotalTile
        label="You owe"
        glyph="−"
        emoji="😅"
        calmEmoji="😌"
        tone="destructive"
        amount={totals.owedByViewer}
      />
    </div>
  );
}
