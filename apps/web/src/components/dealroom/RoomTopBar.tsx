import * as React from "react"
import { Link } from "@tanstack/react-router"
import type { Role } from "@dealrelay/shared"
import { ChevronDown, HelpCircle } from "lucide-react"
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
    <>
      <header
        data-testid="room-header"
        className="h-14 border-b border-border bg-background sticky top-0 z-20"
      >
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm tracking-tight text-foreground font-sans">
              DealRelay
            </span>
            <span className="hidden sm:inline truncate font-mono text-xs text-muted-foreground">
              {roomId}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
                    : "text-muted-foreground hover:text-foreground",
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
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Client
              </Link>
            </div>

            {/* How it works popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-testid="how-it-works-trigger"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 bg-transparent shadow-none cursor-pointer"
                >
                  <HelpCircle className="size-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">How it works</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-3 bg-card border-border shadow-md">
                <div className="space-y-1">
                  <div className="text-xs font-sans font-semibold text-foreground">How DealRelay Works</div>
                  <div className="text-[11px] font-sans text-muted-foreground">
                    Autonomous multi-agent procurement with human steering.
                  </div>
                </div>
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-actor-scout/15 text-actor-scout font-mono text-[10px] font-semibold">
                      1
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-medium text-foreground">Agents read vendor emails</div>
                      <div className="text-muted-foreground leading-snug">
                        Scout ingests inbound venue emails and parses dates, capacities, rates, and curfew limits into structured data.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-actor-finance/15 text-actor-finance font-mono text-[10px] font-semibold">
                      2
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-medium text-foreground">Agents audit and counter</div>
                      <div className="text-muted-foreground leading-snug">
                        Finance audits against event specs to flag budget deltas, while Negotiator prepares strategic counter offers.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-actor-negotiator/15 text-actor-negotiator font-mono text-[10px] font-semibold">
                      3
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-medium text-foreground">Humans decide and steer</div>
                      <div className="text-muted-foreground leading-snug">
                        Clients approve or reject counter offers with inline reasons, while agency and client steer the negotiator with comments.
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Demo disclosure */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-testid="demo-menu"
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
                  className="w-full text-xs font-sans justify-center cursor-pointer"
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

      {/* Role banner under top bar */}
      <div
        data-testid="role-banner"
        className="border-b border-border/60 bg-muted/40 py-2 px-4 sm:px-6 sticky top-14 z-10"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs font-sans text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                activeRole === "agency" ? "bg-actor-agency" : "bg-actor-client",
              )}
            />
            <span>
              {activeRole === "agency"
                ? "You are Northwind Events, the agency. Your agents scout and negotiate venues; you steer them."
                : "You are the client, Northwind's launch owner. Agents bring you counter-offers; you approve, reject or push back."}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
