import * as React from "react"
import { Badge } from "@/components/ui/badge"
import type { ConstraintStatus } from "@/lib/constraints"
import { cn } from "@/lib/utils"

interface ConstraintBadgeProps {
  id: string
  label: string
  status: ConstraintStatus
  detail: string
}

export function ConstraintBadge({ id, label, status, detail }: ConstraintBadgeProps) {
  const statusClasses =
    status === "met"
      ? "border-status-met/30 bg-status-met/10 text-status-met"
      : status === "violated"
        ? "border-status-violated/30 bg-status-violated/10 text-status-violated"
        : "border-status-pending/30 bg-status-pending/10 text-status-pending"

  return (
    <div
      data-testid={`constraint-badge-${id}`}
      data-status={status}
      className={cn(
        "flex flex-col gap-0.5 rounded border px-2.5 py-1.5 text-xs transition-colors",
        statusClasses,
      )}
    >
      <div className="flex items-center justify-between gap-1.5 font-medium">
        <span>{label}</span>
        <Badge
          variant="outline"
          className={cn("h-4 px-1 text-[10px] uppercase tracking-wider font-mono", statusClasses)}
        >
          {status === "pending" ? "awaiting approval" : status}
        </Badge>
      </div>
      <span className="font-mono text-[11px] opacity-90 truncate">{detail}</span>
    </div>
  )
}
