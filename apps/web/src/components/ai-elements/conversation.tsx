"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConversationContextValue {
  isAtBottom: boolean
  isAtTop: boolean
  hasScrollableContent: boolean
  scrollToBottom: (options?: { smooth?: boolean }) => void
  scrollToTop: (options?: { smooth?: boolean }) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null)

export function useConversationContext() {
  const context = React.useContext(ConversationContext)
  if (!context) {
    throw new Error("useConversationContext must be used within a Conversation")
  }
  return context
}

export interface ConversationProps extends React.ComponentProps<"div"> {
  initialStickToBottom?: boolean
}

export const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, children, initialStickToBottom = true, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = React.useState(true)
    const [isAtTop, setIsAtTop] = React.useState(true)
    const [hasScrollableContent, setHasScrollableContent] = React.useState(false)
    const stickToBottomRef = React.useRef(initialStickToBottom)

    const updateScrollState = React.useCallback(() => {
      const el = scrollRef.current
      if (!el) return

      const threshold = 16
      const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const atBottom = scrollBottom <= threshold
      const atTop = el.scrollTop <= threshold
      const isScrollable = el.scrollHeight > el.clientHeight + 4

      setIsAtBottom(atBottom)
      setIsAtTop(atTop)
      setHasScrollableContent(isScrollable)
      stickToBottomRef.current = atBottom
    }, [])

    const scrollToBottom = React.useCallback((options?: { smooth?: boolean }) => {
      const el = scrollRef.current
      if (!el) return
      stickToBottomRef.current = true
      if (options?.smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      } else {
        el.scrollTop = el.scrollHeight
      }
      updateScrollState()
    }, [updateScrollState])

    const scrollToTop = React.useCallback((options?: { smooth?: boolean }) => {
      const el = scrollRef.current
      if (!el) return
      stickToBottomRef.current = false
      if (options?.smooth) {
        el.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        el.scrollTop = 0
      }
      updateScrollState()
    }, [updateScrollState])

    // Attach scroll listener
    React.useEffect(() => {
      const el = scrollRef.current
      if (!el) return

      const onScroll = () => {
        updateScrollState()
      }

      el.addEventListener("scroll", onScroll, { passive: true })
      updateScrollState()

      return () => {
        el.removeEventListener("scroll", onScroll)
      }
    }, [updateScrollState])

    // ResizeObserver to handle layout/content size changes and stick to bottom
    React.useEffect(() => {
      const el = scrollRef.current
      if (!el || typeof ResizeObserver === "undefined") return

      const ro = new ResizeObserver(() => {
        updateScrollState()
        if (stickToBottomRef.current) {
          el.scrollTop = el.scrollHeight
        }
      })

      ro.observe(el)
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild)
      }

      return () => ro.disconnect()
    }, [updateScrollState])

    const contextValue = React.useMemo<ConversationContextValue>(
      () => ({
        isAtBottom,
        isAtTop,
        hasScrollableContent,
        scrollToBottom,
        scrollToTop,
        scrollRef,
      }),
      [isAtBottom, isAtTop, hasScrollableContent, scrollToBottom, scrollToTop]
    )

    return (
      <ConversationContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("relative flex flex-col flex-1 min-h-0 overflow-hidden", className)}
          {...props}
        >
          <ConversationScrollTopButton />
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain min-h-0"
          >
            {children}
          </div>
          <ConversationScrollButton />
        </div>
      </ConversationContext.Provider>
    )
  }
)
Conversation.displayName = "Conversation"

export type ConversationContentProps = React.ComponentProps<"div">

export const ConversationContent = React.forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      className={cn("flex flex-col gap-2 p-3 min-w-0", className)}
      {...props}
    />
  )
)
ConversationContent.displayName = "ConversationContent"

export interface ConversationEmptyStateProps extends React.ComponentProps<"div"> {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export const ConversationEmptyState = React.forwardRef<HTMLDivElement, ConversationEmptyStateProps>(
  ({ className, title = "No messages yet", description, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 py-8 text-center text-xs text-muted-foreground font-sans",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-muted-foreground mb-1">{icon}</div>}
          <div className="font-medium text-foreground/80">{title}</div>
          {description && <p className="text-muted-foreground">{description}</p>}
        </>
      )}
    </div>
  )
)
ConversationEmptyState.displayName = "ConversationEmptyState"

export type ConversationScrollButtonProps = React.ComponentProps<typeof Button>

export const ConversationScrollButton = React.forwardRef<HTMLButtonElement, ConversationScrollButtonProps>(
  ({ className, children, ...props }, ref) => {
    const { isAtBottom, hasScrollableContent, scrollToBottom } = useConversationContext()

    if (!hasScrollableContent || isAtBottom) {
      return null
    }

    return (
      <Button
        ref={ref}
        type="button"
        size="icon"
        variant="outline"
        aria-label="Scroll to newest messages"
        className={cn(
          "absolute bottom-2 left-1/2 -translate-x-1/2 z-20 size-7 rounded-full shadow-sm bg-background/95 hover:bg-background border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer",
          className
        )}
        onClick={() => scrollToBottom({ smooth: true })}
        {...props}
      >
        {children ?? <ArrowDown className="size-3.5" />}
      </Button>
    )
  }
)
ConversationScrollButton.displayName = "ConversationScrollButton"

export const ConversationScrollTopButton = React.forwardRef<HTMLButtonElement, ConversationScrollButtonProps>(
  ({ className, children, ...props }, ref) => {
    const { isAtTop, hasScrollableContent, scrollToTop } = useConversationContext()

    if (!hasScrollableContent || isAtTop) {
      return null
    }

    return (
      <Button
        ref={ref}
        type="button"
        size="icon"
        variant="outline"
        aria-label="Scroll to older messages"
        className={cn(
          "absolute top-2 left-1/2 -translate-x-1/2 z-20 size-7 rounded-full shadow-sm bg-background/95 hover:bg-background border-border/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer",
          className
        )}
        onClick={() => scrollToTop({ smooth: true })}
        {...props}
      >
        {children ?? <ArrowUp className="size-3.5" />}
      </Button>
    )
  }
)
ConversationScrollTopButton.displayName = "ConversationScrollTopButton"
