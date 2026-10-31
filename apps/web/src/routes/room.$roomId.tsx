import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import { RoomTopBar } from "@/components/dealroom/RoomTopBar"
import { ConstraintHeader } from "@/components/dealroom/ConstraintHeader"
import { ComparisonCanvas } from "@/components/dealroom/ComparisonCanvas"
import { TraceFeed } from "@/components/dealroom/TraceFeed"
import { ApprovalBar } from "@/components/dealroom/ApprovalBar"
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

  const { status, state, approve } = useRoomSocket(roomId, activeRole, initialData)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <RoomTopBar roomId={roomId} activeRole={activeRole} status={status} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 flex-1">
        <ConstraintHeader roomId={roomId} specs={state.specs} />

        <ApprovalBar role={activeRole} proposals={state.proposals} onApprove={approve} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <ComparisonCanvas roomId={roomId} role={activeRole} specs={state.specs} proposals={state.proposals} />
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <div className="h-[calc(100vh-8rem)]">
              <TraceFeed activity={state.activity} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
