"use client"

import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

// A titled section that's collapsed by default and expands on tap, with the
// same chevron-rotate + animated-height feel as the amount calculator (see
// amount-input.tsx) — but built on the shared Collapsible primitive instead
// of hand-rolling the grid-rows trick again. Generic chrome, no domain
// knowledge, so it lives in ui/ per DESIGN_SYSTEM.md's placement rule.
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="flex flex-col gap-3">
      <CollapsibleTrigger className="group flex items-center justify-between gap-2 text-left">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
