import * as React from "react"
import { Link } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { killActor } from "@/server/room"
import { cn } from "@/lib/utils"

interface RoomTopBarProps {
  roomId: string
  activeRole: Role
  status: "connecting" | "connected" | "disconnected" | "error"
}

export function RoomTopBar({ roomId, activeRole, status }: RoomTopBarProps) {
  const [loadingKill, setLoadingKill] = React.useState(false)
  const [killMessage, setKillMessage] = React.useState<string | null>(null)

  const handleKillActor = async () => {
    setLoadingKill(true)
    try {
      await killActor({ data: { roomId } })
      setKillMessage("Actor eviction triggered")
      setTimeout(() => setKillMessage(null), 4000)
    } catch (err) {
      console.error("Failed kill actor:", err)
    } finally {
      setLoadingKill(false)
    }
  }

  return (
    <header
      data-testid="room-header"
      className="h-14 border-b border-border bg-background sticky top-0 z-20"
    >
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight text-foreground font-sans">
            DealRelay
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status 6px dot */}
          <div
            data-testid="connection-status"
            title={status}
            aria-label={`Connection status: ${status}`}
            className="flex items-center justify-center p-1"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                status === "connected" && "bg-status-met-foreground",
                status === "connecting" && "bg-status-pending-foreground animate-pulse",
                (status === "disconnected" || status === "error") && "bg-status-violated-foreground",
              )}
            />
            <span className="sr-only">{status}</span>
          </div>

          {/* Role switcher segmented control */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-muted/60 border border-border text-xs font-sans">
            <Link
              to="/room/$roomId"
              params={{ roomId }}
              search={{ role: "agency" }}
              data-testid="switch-role-agency"
              className={cn(
                "px-2.5 py-1 rounded transition-colors",
                activeRole === "agency"
                  ? "bg-primary text-primary-foreground font-medium shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Agency
            </Link>
            <Link
              to="/room/$roomId"
              params={{ roomId }}
              search={{ role: "client" }}
              data-testid="switch-role-client"
              className={cn(
                "px-2.5 py-1 rounded transition-colors",
                activeRole === "client"
                  ? "bg-primary text-primary-foreground font-medium shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Client
            </Link>
          </div>

          {/* Demo disclosure */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border bg-transparent shadow-none"
              >
                <span>Demo</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 space-y-2 bg-card border-border shadow-sm">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Demo actions
              </div>
              <Button
                data-testid="kill-actor"
                variant="destructive"
                size="sm"
                onClick={handleKillActor}
                disabled={loadingKill}
                className="w-full text-xs font-sans justify-center"
              >
                {loadingKill ? "Stopping..." : "Kill actor"}
              </Button>
              {killMessage && (
                <div className="text-[11px] font-mono text-status-pending">
                  {killMessage}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}
