'use client'
import { useCallback, useEffect, useRef } from 'react'

type Options = {
  /** Delay before the first restore attempt. Default 120ms. */
  restoreDelayMs?: number
  /**
   * When true, a saved scroll position is only restored if it was written
   * during the *same* document load. A hard refresh (or any fresh document
   * load) therefore starts at the top instead of restoring the previous
   * session's scroll, while SPA back-navigation (same document) still
   * restores. Default false to preserve the legacy behaviour for existing
   * consumers.
   */
  resetOnReload?: boolean
}

/**
 * Identifier for the current document load. Module scope is re-evaluated on
 * every full page load (hard refresh, fresh navigation) but persists across
 * SPA route changes, so it cleanly distinguishes "scroll saved this session"
 * from "scroll left over from a previous load". `performance.timeOrigin` is
 * stable within a document and differs across loads.
 */
let cachedDocLoadId: string | null = null
function getDocLoadId(): string {
  if (cachedDocLoadId == null) {
    cachedDocLoadId =
      typeof performance !== 'undefined' && performance.timeOrigin
        ? String(performance.timeOrigin)
        : String(Date.now())
  }
  return cachedDocLoadId
}

/**
 * Scroll restoration + listing state preservation hook.
 *
 * Supports two scroll models:
 *   1. Window scroll (default) — the page itself scrolls.
 *   2. Inner container scroll — when a sized div with `overflow-y: auto/scroll`
 *      is the actual scroller (true for the YP Jobs/Companies/Connections/Events
 *      listings, where `.col-lg-8` has `max-height: calc(100vh - 140px)`).
 *
 * Inner-container usage:
 *
 *   const { saveBeforeNavigate, setScrollContainer } = useListingPreserve('job-list')
 *   <div className={styles.jobListing_job_list} ref={setScrollContainer}>
 *
 * Lifecycle:
 *   - Mount: defers one rAF before falling back to window. If the consumer
 *     attaches a container ref synchronously after mount, window-scroll is
 *     never wired up, so detail-page scrolls don't pollute the saved state.
 *   - Container ref swaps (skeleton → real list): listener is detached from
 *     old, re-attached to new, restore is re-attempted.
 *   - Container ref → null (typically unmount): listener is detached and we
 *     do NOT fall back to window. Critical for not capturing detail-page
 *     scroll into the listing's saved scrollY.
 *   - Restore runs synchronously on attach (before paint when invoked from the
 *     container ref callback, so the list never flashes at the top and then
 *     jumps), then re-asserts the position each frame via rAF for a short,
 *     bounded window so a late layout shift (React Query refetch on return,
 *     images, fonts) can't leave it parked at the top. It yields the moment the
 *     user actually scrolls, and persistence is paused mid-restore so a
 *     transient scroll-to-top can't overwrite the saved position.
 */
export function useListingPreserve(key: string, opts: Options = {}) {
  const resetOnReload = opts.resetOnReload ?? false
  const scrollKey = `${key}-scroll`

  const elRef = useRef<HTMLElement | null>(null)
  const usingWindowRef = useRef(false)
  const hasReceivedContainerRef = useRef(false)
  const lastSavedRef = useRef(0)
  const detachRef = useRef<(() => void) | null>(null)
  const restoreCancelRef = useRef<(() => void) | null>(null)
  // True while a restore is actively re-asserting the saved scroll. Used to
  // pause persistence so a transient scroll-to-top (from a data refetch
  // re-render) can't overwrite the saved position with 0 mid-restore.
  const isRestoringRef = useRef(false)

  const readSavedY = useCallback((): number | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.sessionStorage.getItem(scrollKey)
      if (raw == null) return null
      if (resetOnReload) {
        // Stored as `${y}|${docLoadId}`. Only honour the position if it was
        // saved during the current document load; otherwise it's a leftover
        // from a previous load (hard refresh) and must not be restored.
        const sep = raw.lastIndexOf('|')
        if (sep === -1) return null
        const savedId = raw.slice(sep + 1)
        if (savedId !== getDocLoadId()) return null
        const y = Number(raw.slice(0, sep))
        return Number.isFinite(y) ? y : null
      }
      const y = Number(raw)
      return Number.isFinite(y) ? y : null
    } catch {
      return null
    }
  }, [scrollKey, resetOnReload])

  const writeY = useCallback(
    (y: number) => {
      if (typeof window === 'undefined') return
      try {
        const value = resetOnReload ? `${y}|${getDocLoadId()}` : String(y)
        window.sessionStorage.setItem(scrollKey, value)
      } catch {}
    },
    [scrollKey, resetOnReload],
  )

  const currentY = useCallback((): number => {
    if (elRef.current) return elRef.current.scrollTop
    if (usingWindowRef.current && typeof window !== 'undefined') return window.scrollY
    return 0
  }, [])

  const persistNow = useCallback(
    (force = false) => {
      if (typeof window === 'undefined') return
      // Don't persist if we're not actually wired up to anything — guards
      // against accidentally overwriting the saved scroll with 0 during the
      // brief moment between mount and a container ref being set.
      if (!elRef.current && !usingWindowRef.current) return
      // While a restore is mid-flight the scroll may transiently sit at the
      // top (the list re-rendering from a refetch); don't let that clobber the
      // saved position. An explicit save (force) — e.g. a card click — always
      // wins.
      if (isRestoringRef.current && !force) return
      writeY(currentY())
    },
    [currentY, writeY],
  )

  const cancelPendingRestore = useCallback(() => {
    if (restoreCancelRef.current) {
      restoreCancelRef.current()
      restoreCancelRef.current = null
    }
  }, [])

  const scheduleRestore = useCallback(() => {
    if (typeof window === 'undefined') return
    cancelPendingRestore()
    const y = readSavedY()
    if (y == null || y <= 0) return

    const setNow = () => {
      if (elRef.current) {
        elRef.current.scrollTop = y
      } else if (usingWindowRef.current) {
        window.scrollTo({ top: y, behavior: 'auto' })
      }
    }

    isRestoringRef.current = true

    // Restore synchronously straight away. When this runs from the container
    // ref callback (during commit) it lands BEFORE the first paint, so the
    // list never flashes at the top and then visibly jumps to the saved
    // position on back-navigation.
    setNow()

    // Then hold the position for a short window via rAF. A data refetch on
    // return (refetchOnMount / invalidate) re-renders the list and can reset
    // its scroll to the top a frame or two later; re-asserting every frame
    // keeps it pinned (no visible gap) until the layout settles. We yield as
    // soon as the user actually takes control.
    const startedAt = Date.now()
    let stableFrames = 0
    let rafId = 0

    const finish = (persist: boolean) => {
      if (rafId) window.cancelAnimationFrame(rafId)
      rafId = 0
      restoreCancelRef.current = null
      isRestoringRef.current = false
      // Save the final resting position so the next navigation captures it.
      if (persist) persistNow()
    }

    const tick = () => {
      const cur = currentY()
      // User has taken control: a real scroll to somewhere that is neither the
      // top (a transient reset) nor the saved target. Stop and let them be.
      if (cur > 50 && Math.abs(cur - y) > 8) {
        finish(false)
        return
      }
      setNow()
      if (Math.abs(currentY() - y) <= 2) stableFrames += 1
      else stableFrames = 0
      // Settle once the position has held for a few frames, or give up after a
      // bounded window so we never fight the page indefinitely.
      if (stableFrames >= 5 || Date.now() - startedAt > 1500) {
        finish(true)
        return
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    restoreCancelRef.current = () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      rafId = 0
      isRestoringRef.current = false
    }
  }, [cancelPendingRestore, currentY, persistNow, readSavedY])

  const attachScrollListener = useCallback(
    (target: HTMLElement | Window): (() => void) => {
      let rafId: number | null = null
      const onScroll = () => {
        if (rafId != null) return
        rafId = window.requestAnimationFrame(() => {
          rafId = null
          const now = Date.now()
          if (now - lastSavedRef.current < 100) return
          lastSavedRef.current = now
          persistNow()
        })
      }
      target.addEventListener('scroll', onScroll as EventListener, {
        passive: true,
      })
      return () => {
        target.removeEventListener('scroll', onScroll as EventListener)
        if (rafId != null) window.cancelAnimationFrame(rafId)
      }
    },
    [persistNow],
  )

  // Defer window fallback by one frame so a container ref attached on the
  // same render takes precedence. If no container ref ever shows up, we
  // wire up window-scroll preservation as the legacy behaviour.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled) return
      if (hasReceivedContainerRef.current) return
      usingWindowRef.current = true
      detachRef.current = attachScrollListener(window)
      scheduleRestore()
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
      if (detachRef.current) {
        detachRef.current()
        detachRef.current = null
      }
      cancelPendingRestore()
      // After unmount, leave usingWindowRef as-is; the next mount creates
      // a fresh hook instance with fresh refs anyway.
    }
  }, [attachScrollListener, scheduleRestore, cancelPendingRestore])

  const setScrollContainer = useCallback(
    (el: HTMLElement | null) => {
      if (elRef.current === el) return

      if (detachRef.current) {
        detachRef.current()
        detachRef.current = null
      }
      cancelPendingRestore()

      elRef.current = el

      if (el) {
        hasReceivedContainerRef.current = true
        usingWindowRef.current = false
        detachRef.current = attachScrollListener(el)
        scheduleRestore()
      } else {
        // The container is going away (typically unmount or a swap to a
        // different conditional branch). Do NOT fall back to window —
        // doing so would capture the scroll of the page we're navigating
        // *to* and overwrite the listing's saved scrollY. If a new ref
        // attaches in the same tick, the call above will re-establish.
        usingWindowRef.current = false
      }
    },
    [attachScrollListener, cancelPendingRestore, scheduleRestore],
  )

  const saveBeforeNavigate = useCallback(() => {
    if (typeof window === 'undefined') return
    persistNow(true)
  }, [persistNow])

  return { saveBeforeNavigate, setScrollContainer }
}
