import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"

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

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-xl font-semibold">DealRelay Room: {roomId}</h1>
      <p className="text-sm text-muted-foreground">Role: {role}</p>
    </div>
  )
}
