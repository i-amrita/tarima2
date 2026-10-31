import * as React from "react"
import type { Role, VenueProposal } from "@dealrelay/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { triggerSimulation, vendorAcceptsCounter, killActor } from "@/server/room"

interface SimulationDrawerProps {
  roomId: string
  role: Role
  proposals: VenueProposal[]
}

export function SimulationDrawer({ roomId, role, proposals }: SimulationDrawerProps) {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)
  const [killMessage, setKillMessage] = React.useState<string | null>(null)

  if (role !== "agency") {
    return null
  }

  const handleInject = async (kind: "grand-loft" | "warehouse-9") => {
    setLoadingAction(kind)
    try {
      await triggerSimulation({ data: { roomId, kind } })
    } catch (err) {
      console.error(`Failed to inject ${kind}:`, err)
    } finally {
      setLoadingAction(null)
    }
  }

  // Find candidate proposal for vendor acceptance (prefer COUNTER_PROPOSED, fallback to last proposal)
  const candidateProposal =
    proposals.find((p) => p.status === "COUNTER_PROPOSED") ?? proposals[proposals.length - 1]

  const handleVendorAccepts = async () => {
    if (!candidateProposal) return
    setLoadingAction("vendor-accepts")
    try {
      await vendorAcceptsCounter({
        data: { roomId, proposalId: candidateProposal.id },
      })
    } catch (err) {
      console.error("Failed vendor accepts:", err)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleKillActor = async () => {
    setLoadingAction("kill-actor")
    try {
      await killActor({ data: { roomId } })
      setKillMessage("Actor eviction triggered (demo placeholder)")
      setTimeout(() => setKillMessage(null), 4000)
    } catch (err) {
      console.error("Failed kill actor:", err)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <Card
      data-testid="simulation-drawer"
      className="p-4 border-t border-border bg-card/95 backdrop-blur shadow-lg sticky bottom-0 z-30"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs uppercase border-primary/30 text-primary">
            Agency Control
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Procurement Simulator Triggers
          </span>
          {killMessage && (
            <span className="text-xs font-mono text-status-pending">{killMessage}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            data-testid="inject-grand-loft"
            variant="outline"
            size="sm"
            onClick={() => handleInject("grand-loft")}
            disabled={loadingAction !== null}
            className="text-xs font-mono"
          >
            {loadingAction === "grand-loft" ? "Injecting..." : "Inject Grand Loft"}
          </Button>

          <Button
            data-testid="inject-warehouse-9"
            variant="outline"
            size="sm"
            onClick={() => handleInject("warehouse-9")}
            disabled={loadingAction !== null}
            className="text-xs font-mono"
          >
            {loadingAction === "warehouse-9" ? "Injecting..." : "Inject Warehouse 9"}
          </Button>

          <Button
            data-testid="vendor-accepts"
            variant="secondary"
            size="sm"
            onClick={handleVendorAccepts}
            disabled={!candidateProposal || loadingAction !== null}
            className="text-xs font-mono"
          >
            {loadingAction === "vendor-accepts"
              ? "Accepting..."
              : candidateProposal
                ? `Vendor accepts (${candidateProposal.id})`
                : "Vendor accepts"}
          </Button>

          <Button
            data-testid="kill-actor"
            variant="destructive"
            size="sm"
            onClick={handleKillActor}
            disabled={loadingAction !== null}
            className="text-xs font-mono"
          >
            {loadingAction === "kill-actor" ? "Stopping..." : "Kill actor"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
