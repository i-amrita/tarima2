import { useEffect, useMemo, useSyncExternalStore } from "react"
import type { Role, RoomState, RoomIncoming } from "@dealrelay/shared"
import { getSocketGrant } from "../server/room"

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export interface RoomSocketStoreState {
  status: ConnectionStatus
  state: RoomState
  lastToast: string | null
}

const EMPTY_ROOM_STATE: RoomState = {
  specs: null,
  proposals: [],
  activity: [],
}

class RoomSocketManager {
  private listeners = new Set<() => void>()
  private ws: WebSocket | null = null
  private destroyed = false
  private retryTimeout: ReturnType<typeof setTimeout> | null = null

  private snapshot: RoomSocketStoreState = {
    status: "connecting",
    state: EMPTY_ROOM_STATE,
    lastToast: null,
  }

  constructor(
    private roomId: string,
    private role: Role,
  ) {
    this.connect()
  }

  private notify() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private updateSnapshot(partial: Partial<RoomSocketStoreState>) {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
    }
    this.notify()
  }

  private async connect() {
    if (this.destroyed) return

    this.updateSnapshot({ status: "connecting" })

    try {
      const grant = await getSocketGrant({
        data: { roomId: this.roomId, role: this.role },
      })

      if (this.destroyed) return

      const ws = new WebSocket(grant.websocketUrl)
      this.ws = ws

      ws.onopen = () => {
        if (this.destroyed) {
          ws.close()
          return
        }
        this.updateSnapshot({ status: "connected" })
      }

      ws.onmessage = (event: MessageEvent) => {
        if (this.destroyed) return
        try {
          const raw = typeof event.data === "string" ? event.data : ""
          if (!raw) return
          const msg = JSON.parse(raw) as
            | { type: "state"; state: Partial<RoomState> }
            | { type: "state_update"; changes: Partial<RoomState> }
            | { type: "toast"; message: string }

          if (msg.type === "state" && msg.state) {
            this.updateSnapshot({
              state: {
                specs: msg.state.specs ?? null,
                proposals: msg.state.proposals ?? [],
                activity: msg.state.activity ?? [],
              },
            })
          } else if (msg.type === "state_update" && msg.changes) {
            this.updateSnapshot({
              state: {
                ...this.snapshot.state,
                ...msg.changes,
              },
            })
          } else if (msg.type === "toast" && msg.message) {
            this.updateSnapshot({ lastToast: msg.message })
          }
        } catch (err) {
          console.error("Failed to parse socket payload:", err)
        }
      }

      ws.onerror = (e) => {
        if (this.destroyed) return
        console.warn("WebSocket error for room:", this.roomId, e)
        this.updateSnapshot({ status: "error" })
      }

      ws.onclose = () => {
        this.ws = null
        if (this.destroyed) return
        this.updateSnapshot({ status: "disconnected" })
        this.retryTimeout = setTimeout(() => {
          this.connect()
        }, 2000)
      }
    } catch (err) {
      if (this.destroyed) return
      console.warn("Failed to get socket grant:", err)
      this.updateSnapshot({ status: "error" })
      this.retryTimeout = setTimeout(() => {
        this.connect()
      }, 3000)
    }
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getSnapshot = (): RoomSocketStoreState => {
    return this.snapshot
  }

  public send(message: RoomIncoming) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("Cannot send message, socket is not open")
    }
  }

  public approve(proposalId: string) {
    this.send({ type: "approve", proposalId })
  }

  public destroy() {
    this.destroyed = true
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }
}

export function useRoomSocket(roomId: string, role: Role) {
  const manager = useMemo(() => new RoomSocketManager(roomId, role), [roomId, role])

  useEffect(() => {
    return () => {
      manager.destroy()
    }
  }, [manager])

  const store = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot)

  return {
    ...store,
    send: manager.send.bind(manager),
    approve: manager.approve.bind(manager),
  }
}
