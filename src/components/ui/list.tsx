import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function List({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list"
      role="list"
      className={cn(
        "flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className
      )}
      {...props}
    />
  )
}

type ListItemProps = {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  /** Renders as a Next.js Link when provided. */
  href?: string
  showChevron?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
  className?: string
  id?: string
}

function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  href,
  showChevron,
  className,
  onClick,
  id,
}: ListItemProps) {
  const interactive = Boolean(href || onClick)
  const content = (
    <>
      {leading && (
        <span data-slot="list-item-leading" className="flex shrink-0 items-center justify-center">
          {leading}
        </span>
      )}
      <span data-slot="list-item-body" className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && (
          <span className="truncate text-sm text-muted-foreground">{subtitle}</span>
        )}
      </span>
      {trailing && (
        <span data-slot="list-item-trailing" className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
          {trailing}
        </span>
      )}
      {showChevron && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  )

  const sharedClassName = cn(
    "flex min-h-14 items-center gap-3 px-4 py-2 text-left",
    interactive && "active:bg-muted/70",
    className
  )

  if (href) {
    return (
      <Link data-slot="list-item" id={id} href={href} className={sharedClassName}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        data-slot="list-item"
        id={id}
        onClick={onClick}
        className={cn(sharedClassName, "w-full")}
      >
        {content}
      </button>
    )
  }

  return (
    <div data-slot="list-item" id={id} role="listitem" className={sharedClassName}>
      {content}
    </div>
  )
}

export { List, ListItem }
