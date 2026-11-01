import { useEffect, useMemo, useSyncExternalStore } from "react"
import type { Role, RoomState, RoomIncoming } from "@dealrelay/shared"
import { getSocketGrant } from "../server/room"
import { FEEDBACK_DEMO_STATE } from "../lib/fixtures"

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
  private destroyed = true
  private generation = 0
  private retryTimeout: ReturnType<typeof setTimeout> | null = null

  private snapshot: RoomSocketStoreState = {
    status: "connecting",
    state: EMPTY_ROOM_STATE,
    lastToast: null,
  }

  constructor(
    private roomId: string,
    private role: Role,
    initialState?: RoomState,
  ) {
    if (roomId === "feedback-demo") {
      this.snapshot = {
        status: "connected",
        state: initialState ?? FEEDBACK_DEMO_STATE,
        lastToast: null,
      }
    } else if (initialState) {
      this.snapshot = {
        status: "connecting",
        state: initialState,
        lastToast: null,
      }
    }
  }

  /** Idempotent and restartable so StrictMode's mount/unmount/mount cycle works. */
  public start() {
    if (typeof window === "undefined") return
    this.destroyed = false
    this.generation++
    void this.connect(this.generation)
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

  private async connect(generation: number) {
    if (this.destroyed || generation !== this.generation) return

    if (this.roomId === "feedback-demo") {
      this.updateSnapshot({ status: "connected" })
      return
    }

    this.updateSnapshot({ status: "connecting" })

    try {
      const grant = await getSocketGrant({
        data: { roomId: this.roomId, role: this.role },
      })

      if (this.destroyed || generation !== this.generation) return

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
          this.connect(generation)
        }, 2000)
      }
    } catch (err) {
      if (this.destroyed) return
      console.warn("Failed to get socket grant:", err)
      this.updateSnapshot({ status: "error" })
      this.retryTimeout = setTimeout(() => {
        this.connect(generation)
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

  public reject(proposalId: string, reason?: string) {
    if (this.roomId === "feedback-demo") {
      const proposals = this.snapshot.state.proposals.map((p) => {
        if (p.id !== proposalId) return p
        const feedback = [
          ...(p.feedback ?? []),
          {
            id: `fb-${Date.now()}`,
            at: Date.now(),
            by: this.role,
            kind: "reject" as const,
            text: reason ?? "Proposal rejected by client",
          },
        ]
        return { ...p, status: "REJECTED" as const, feedback }
      })
      this.updateSnapshot({ state: { ...this.snapshot.state, proposals } })
      return
    }
    this.send({ type: "reject", proposalId, ...(reason ? { reason } : {}) })
  }

  public comment(proposalId: string, text: string) {
    if (this.roomId === "feedback-demo") {
      const proposals = this.snapshot.state.proposals.map((p) => {
        if (p.id !== proposalId) return p
        const feedback = [
          ...(p.feedback ?? []),
          {
            id: `fb-${Date.now()}`,
            at: Date.now(),
            by: this.role,
            kind: "comment" as const,
            text,
          },
        ]
        return {
          ...p,
          status: "REVISING" as const,
          revision: (p.revision ?? 0) + 1,
          feedback,
        }
      })
      this.updateSnapshot({ state: { ...this.snapshot.state, proposals } })
      return
    }
    this.send({ type: "comment", proposalId, text })
  }

  public stop() {
    this.destroyed = true
    this.generation++
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export function useRoomSocket(roomId: string, role: Role, initialState?: RoomState) {
  const manager = useMemo(() => new RoomSocketManager(roomId, role, initialState), [roomId, role])

  useEffect(() => {
    manager.start()
    return () => manager.stop()
  }, [manager])

  const store = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot)

  return {
    ...store,
    send: manager.send.bind(manager),
    approve: manager.approve.bind(manager),
    reject: manager.reject.bind(manager),
    comment: manager.comment.bind(manager),
  }
}
