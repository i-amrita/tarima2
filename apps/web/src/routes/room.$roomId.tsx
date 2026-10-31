import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import { Badge } from "@/components/ui/badge"

type RoomSearch = {
  role?: Role
}

export const Route = createFileRoute("/room/$roomId")({
  validateSearch: (search: Record<string, unknown>): RoomSearch => {
    return {
      role: search.role === "client" ? "client" : "agency",
    }
  },
  component: RoomComponent,
})

function RoomComponent() {
  const { roomId } = Route.useParams()
  const { role } = Route.useSearch()
  const activeRole: Role = role === "client" ? "client" : "agency"

  const { status, state, lastToast, approve } = useRoomSocket(roomId, activeRole)

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">DealRelay Room: {roomId}</h1>
          <p className="text-xs text-muted-foreground">
            Role: <span className="font-mono text-foreground font-semibold">{activeRole}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              status === "connected"
                ? "default"
                : status === "connecting"
                  ? "secondary"
                  : "destructive"
            }
          >
            {status}
          </Badge>
          {lastToast && (
            <span className="text-xs text-status-pending font-mono">
              Toast: {lastToast}
            </span>
          )}
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Live Room Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-xs font-mono text-muted-foreground mb-2">Specs</h3>
            <pre className="text-xs font-mono overflow-auto max-h-48 text-foreground">
              {JSON.stringify(state.specs, null, 2)}
            </pre>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-xs font-mono text-muted-foreground mb-2">
              Proposals ({state.proposals.length})
            </h3>
            <pre className="text-xs font-mono overflow-auto max-h-48 text-foreground">
              {JSON.stringify(state.proposals, null, 2)}
            </pre>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-xs font-mono text-muted-foreground mb-2">
              Activity ({state.activity.length})
            </h3>
            <pre className="text-xs font-mono overflow-auto max-h-48 text-foreground">
              {JSON.stringify(state.activity, null, 2)}
            </pre>
          </div>
        </div>

        {activeRole === "client" && state.proposals.length > 0 && (
          <div className="flex gap-2 pt-2">
            {state.proposals.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => approve(p.id)}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Approve {p.id}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
