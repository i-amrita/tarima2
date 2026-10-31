import * as React from "react"
import type { EventSpecs, VenueProposal } from "@dealrelay/shared"
import { VenueCard } from "./VenueCard"

interface ComparisonCanvasProps {
  specs: EventSpecs | null
  proposals: VenueProposal[]
}

export function ComparisonCanvas({ specs, proposals }: ComparisonCanvasProps) {
  return (
    <div data-testid="comparison-canvas" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Proposals ({proposals.length})
        </h2>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground font-mono">
          No venue proposals received yet. Use the simulation drawer below to inject proposals.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proposals.map((proposal) => (
            <VenueCard key={proposal.id} proposal={proposal} specs={specs} />
          ))}
        </div>
      )}
    </div>
  )
}
