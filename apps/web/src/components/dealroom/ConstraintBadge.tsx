import * as React from "react"
import { Wallet, Users, Moon, Volume2 } from "lucide-react"
import type { ConstraintStatus } from "@/lib/constraints"
import { cn } from "@/lib/utils"

interface ConstraintBadgeProps {
  id: string
  label?: string
  status: ConstraintStatus
  detail: string
  value?: string
}

function getIcon(id: string) {
  switch (id) {
    case "budget":
      return Wallet
    case "capacity":
      return Users
    case "curfew":
      return Moon
    case "av":
    default:
      return Volume2
  }
}

export function ConstraintBadge({ id, status, detail, value }: ConstraintBadgeProps) {
  const Icon = getIcon(id)

  const statusClasses =
    status === "met"
      ? "border-status-met-border bg-status-met text-status-met-foreground"
      : status === "violated"
        ? "border-status-violated-border bg-status-violated text-status-violated-foreground"
        : "border-status-pending-border bg-status-pending text-status-pending-foreground"

  const displayValue = value ?? (id === "av" ? "AV" : detail)

  return (
    <span
      data-testid={`constraint-badge-${id}`}
      data-status={status}
      title={detail}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono transition-colors cursor-default",
        statusClasses,
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span>{displayValue}</span>
    </span>
  )
}
