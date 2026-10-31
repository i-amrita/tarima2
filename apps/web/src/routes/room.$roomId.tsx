import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import { Badge } from "@/components/ui/badge"
import { ConstraintHeader } from "@/components/dealroom/ConstraintHeader"
import { ComparisonCanvas } from "@/components/dealroom/ComparisonCanvas"
import { TraceFeed } from "@/components/dealroom/TraceFeed"
import { ApprovalBar } from "@/components/dealroom/ApprovalBar"
import { SimulationDrawer } from "@/components/dealroom/SimulationDrawer"

import { getRoomState } from "@/server/room"

type RoomSearch = {
  role?: Role
}

export const Route = createFileRoute("/room/$roomId")({
  validateSearch: (search: Record<string, unknown>): RoomSearch => {
    return {
      role: search.role === "client" ? "client" : "agency",
    }
  },
  loader: async ({ params }) => {
    return await getRoomState({ data: { roomId: params.roomId } })
  },
  component: RoomComponent,
})

function RoomComponent() {
  const { roomId } = Route.useParams()
  const { role } = Route.useSearch()
  const initialData = Route.useLoaderData()
  const activeRole: Role = role === "client" ? "client" : "agency"

  const { status, state, lastToast, approve } = useRoomSocket(roomId, activeRole, initialData)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div className="p-4 sm:p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        <header
          data-testid="room-header"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                DealRelay
              </span>
              <span className="text-muted-foreground text-xs font-mono">/</span>
              <span className="font-mono text-xs text-muted-foreground">Room: {roomId}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Procurement Deal Room
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-border p-1 bg-muted/20 text-xs font-mono">
              <span className="text-muted-foreground px-2">Role:</span>
              <Link
                to="/room/$roomId"
                params={{ roomId }}
                search={{ role: "agency" }}
                data-testid="switch-role-agency"
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeRole === "agency"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                agency
              </Link>
              <Link
                to="/room/$roomId"
                params={{ roomId }}
                search={{ role: "client" }}
                data-testid="switch-role-client"
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeRole === "client"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                client
              </Link>
            </div>

            <Badge
              data-testid="connection-status"
              variant={
                status === "connected"
                  ? "default"
                  : status === "connecting"
                    ? "secondary"
                    : "destructive"
              }
              className="font-mono text-xs"
            >
              {status}
            </Badge>

            {lastToast && (
              <Badge
                variant="outline"
                className="text-xs font-mono text-status-pending border-status-pending/40 bg-status-pending/10"
              >
                {lastToast}
              </Badge>
            )}
          </div>
        </header>

        <ConstraintHeader roomId={roomId} specs={state.specs} />

        <ApprovalBar role={activeRole} proposals={state.proposals} onApprove={approve} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <ComparisonCanvas specs={state.specs} proposals={state.proposals} />
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-6">
            <div className="h-[600px]">
              <TraceFeed activity={state.activity} />
            </div>
          </div>
        </div>
      </div>

      <SimulationDrawer roomId={roomId} role={activeRole} proposals={state.proposals} />
    </div>
  )
}
