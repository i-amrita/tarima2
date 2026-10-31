import * as React from "react"
import type { EventSpecs, Role, VenueProposal } from "@dealrelay/shared"
import { Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { triggerSimulation, vendorAcceptsCounter } from "@/server/room"
import { VenueCard } from "./VenueCard"

interface ComparisonCanvasProps {
  roomId: string
  role: Role
  specs: EventSpecs | null
  proposals: VenueProposal[]
}

export function ComparisonCanvas({ roomId, role, specs, proposals }: ComparisonCanvasProps) {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)

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

  return (
    <div data-testid="comparison-canvas" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-semibold text-foreground font-sans">
            Proposals
          </h2>
          <span className="text-sm font-sans text-muted-foreground">
            ({proposals.length})
          </span>
        </div>

        {role === "agency" && (
          <div
            data-testid="simulation-drawer"
            className="flex flex-wrap items-center gap-1"
          >
            <Button
              data-testid="inject-grand-loft"
              variant="ghost"
              size="sm"
              onClick={() => handleInject("grand-loft")}
              disabled={loadingAction !== null}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded font-sans cursor-pointer"
            >
              <Plus className="size-3.5 mr-1 text-muted-foreground" />
              <span>{loadingAction === "grand-loft" ? "Injecting..." : "Inject Grand Loft"}</span>
            </Button>

            <Button
              data-testid="inject-warehouse-9"
              variant="ghost"
              size="sm"
              onClick={() => handleInject("warehouse-9")}
              disabled={loadingAction !== null}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded font-sans cursor-pointer"
            >
              <Plus className="size-3.5 mr-1 text-muted-foreground" />
              <span>{loadingAction === "warehouse-9" ? "Injecting..." : "Inject Warehouse 9"}</span>
            </Button>

            <Button
              data-testid="vendor-accepts"
              variant="ghost"
              size="sm"
              onClick={handleVendorAccepts}
              disabled={!candidateProposal || loadingAction !== null}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded font-sans cursor-pointer"
            >
              <Check className="size-3.5 mr-1 text-muted-foreground" />
              <span>{loadingAction === "vendor-accepts" ? "Accepting..." : "Vendor accepts"}</span>
            </Button>
          </div>
        )}
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-sans">
          Nothing here yet. Inject a proposal to start the agent audit.
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <VenueCard key={proposal.id} proposal={proposal} specs={specs} />
          ))}
        </div>
      )}
    </div>
  )
}
