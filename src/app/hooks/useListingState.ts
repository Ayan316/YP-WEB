'use client'

import { useCallback, useState } from 'react'

/**
 * Persists listing UI state (active tab, search text, applied filters, etc.)
 * to sessionStorage so back-navigation from a detail page restores the
 * listing in exactly the state the user left it.
 *
 * Pairs with `useListingPreserve` (which handles scroll) and TanStack Query
 * (which handles cached server data). When a listing remounts, its query
 * keys recompute from the restored state and TanStack Query short-circuits
 * with cached pages — no extra network round-trip.
 *
 *   const [state, setState] = useListingState('job-list', {
 *     activeTab: 'all',
 *     search: '',
 *     filters: { ... },
 *   })
 *
 * The first arg is a stable, app-unique key. Stored under
 * `yp:listing:<key>:state`.
 */
export function useListingState<T>(
  key: string,
  defaults: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = `yp:listing:${key}:state`

  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return defaults
      const parsed = JSON.parse(raw)
      return mergeDefaults(defaults, parsed)
    } catch {
      return defaults
    }
  })

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      setStateInternal(prev => {
        const value =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(value))
        } catch {}
        return value
      })
    },
    [storageKey],
  )

  return [state, setState]
}

/**
 * Shallow-merge persisted state on top of defaults so newly-added state
 * fields stay defined when the persisted blob predates them.
 */
function mergeDefaults<T>(defaults: T, persisted: any): T {
  if (
    persisted &&
    typeof persisted === 'object' &&
    !Array.isArray(persisted) &&
    defaults &&
    typeof defaults === 'object' &&
    !Array.isArray(defaults)
  ) {
    return { ...(defaults as object), ...persisted } as T
  }
  return persisted as T
}

/**
 * Manually clear a listing's persisted state (e.g. on logout).
 */
export function clearListingState(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(`yp:listing:${key}:state`)
  } catch {}
}

/**
 * Clear every persisted listing-state entry. Call on logout and on
 * account deletion so the next session starts clean.
 *
 * Iterates sessionStorage keys with the `yp:listing:` prefix so future
 * listings are picked up automatically without updating this list.
 */
export function clearAllListingState(): void {
  if (typeof window === 'undefined') return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key && key.startsWith('yp:listing:')) toRemove.push(key)
    }
    toRemove.forEach(k => window.sessionStorage.removeItem(k))
  } catch {}
}
