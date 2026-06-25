'use client'

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import jobstyles from '@/moduleCss/jobs.module.css'
import { useTheme } from '@/context/ThemeContext'

/**
 * Renders a single-line row of job location chips. At most `maxVisible` chips
 * are shown (and never more than physically fit on one line); any remaining
 * locations collapse into a "+N" badge. Tapping the badge opens a modal that
 * lists every location in full (styled to match the mobile app, theme-aware).
 * Used by the jobs listing cards and the home "Recommended Jobs" cards.
 */

// gap between chips in px — must match the inline `gap` used on the rows below.
const GAP = 6

// SSR-safe layout effect (avoids the server-render warning).
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

const PinIcon = ({
  isLight,
  w = 9,
  h = 11,
}: {
  isLight: boolean
  w?: number
  h?: number
}) =>
  isLight ? (
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      <svg xmlns='http://www.w3.org/2000/svg' width={w} height={h} viewBox='0 0 9 10' fill='none'>
        <path
          d='M4.0885 9.21565C5.14818 8.26701 5.9591 7.3571 6.52126 6.48592C7.08342 5.61474 7.3645 4.85171 7.3645 4.19683C7.3645 3.20938 7.05078 2.3976 6.42335 1.7615C5.79592 1.1254 5.01764 0.807354 4.0885 0.807354C3.15936 0.807354 2.38108 1.1254 1.75365 1.7615C1.12622 2.3976 0.8125 3.20938 0.8125 4.19683C0.8125 4.85171 1.09358 5.61474 1.65574 6.48592C2.2179 7.3571 3.02882 8.26701 4.0885 9.21565ZM4.0885 9.98847C3.98297 9.98847 3.87743 9.97028 3.7719 9.9339C3.66627 9.89742 3.57076 9.841 3.48535 9.76463C2.9993 9.31667 2.54443 8.85535 2.12076 8.38067C1.69718 7.90608 1.32898 7.43162 1.01617 6.9573C0.703264 6.48298 0.455677 6.01286 0.273406 5.54694C0.0911355 5.08092 0 4.63089 0 4.19683C0 2.94685 0.404309 1.93488 1.21293 1.16093C2.02164 0.386975 2.98016 0 4.0885 0C5.19684 0 6.15536 0.386975 6.96407 1.16093C7.77269 1.93488 8.177 2.94685 8.177 4.19683C8.177 4.63089 8.08587 5.08002 7.90359 5.54423C7.72132 6.00853 7.47464 6.47869 7.16354 6.95473C6.85235 7.43076 6.48497 7.90522 6.06139 8.37809C5.6378 8.85106 5.18294 9.31148 4.69679 9.75934C4.61265 9.83572 4.517 9.893 4.40984 9.93119C4.30277 9.96938 4.19566 9.98847 4.0885 9.98847ZM4.08945 5.07284C4.35893 5.07284 4.58932 4.97688 4.78061 4.78495C4.972 4.59302 5.0677 4.36231 5.0677 4.09283C5.0677 3.82335 4.97173 3.59292 4.7798 3.40153C4.58787 3.21023 4.35712 3.11458 4.08755 3.11458C3.81807 3.11458 3.58768 3.21055 3.39639 3.40248C3.205 3.59441 3.1093 3.82516 3.1093 4.09473C3.1093 4.36421 3.20527 4.5946 3.3972 4.7859C3.58913 4.97719 3.81988 5.07284 4.08945 5.07284Z'
          fill='#3960FB'
        />
      </svg>
    </span>
  ) : (
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      <svg xmlns='http://www.w3.org/2000/svg' width={w} height={h} viewBox='0 0 9 11' fill='none'>
        <path
          d='M4.403 9.92454C5.54419 8.90293 6.41749 7.92303 7.0229 6.98483C7.6283 6.04664 7.931 5.22492 7.931 4.51967C7.931 3.45625 7.59315 2.58203 6.91746 1.897C6.24176 1.21197 5.40361 0.869458 4.403 0.869458C3.40239 0.869458 2.56424 1.21197 1.88854 1.897C1.21285 2.58203 0.875 3.45625 0.875 4.51967C0.875 5.22492 1.1777 6.04664 1.7831 6.98483C2.38851 7.92303 3.26181 8.90293 4.403 9.92454ZM4.403 10.7568C4.28935 10.7568 4.17569 10.7372 4.06204 10.698C3.94829 10.6588 3.84543 10.598 3.75346 10.5158C3.23001 10.0333 2.74016 9.53653 2.2839 9.02533C1.82773 8.51424 1.43121 8.00329 1.09433 7.49248C0.757361 6.98167 0.490729 6.47539 0.294438 5.97363C0.0981459 5.47176 0 4.98711 0 4.51967C0 3.17353 0.43541 2.08372 1.30623 1.25023C2.17715 0.416743 3.2094 0 4.403 0C5.5966 0 6.62885 0.416743 7.49977 1.25023C8.37059 2.08372 8.806 3.17353 8.806 4.51967C8.806 4.98711 8.70785 5.47079 8.51156 5.97071C8.31527 6.47072 8.04961 6.97706 7.71458 7.48971C7.37946 8.00236 6.98381 8.51331 6.52765 9.02256C6.07148 9.53191 5.58162 10.0277 5.05808 10.5101C4.96747 10.5923 4.86447 10.654 4.74906 10.6951C4.63376 10.7363 4.5184 10.7568 4.403 10.7568ZM4.40402 5.46306C4.69423 5.46306 4.94234 5.35972 5.14835 5.15302C5.35446 4.94633 5.45752 4.69788 5.45752 4.40767C5.45752 4.11746 5.35417 3.8693 5.14748 3.66319C4.94078 3.45717 4.69228 3.35417 4.40198 3.35417C4.11177 3.35417 3.86366 3.45751 3.65765 3.66421C3.45153 3.8709 3.34848 4.1194 3.34848 4.40971C3.34848 4.69992 3.45183 4.94803 3.65852 5.15404C3.86522 5.36006 4.11372 5.46306 4.40402 5.46306Z'
          fill='#A0AEC0'
        />
      </svg>
    </span>
  )

// Small chip used on the single-line card row (matches the listing cards).
// When `maxWidth` is supplied the label truncates with an ellipsis instead of
// overflowing — used for the lone-but-very-long-location edge case.
const LocationChip = ({
  loc,
  isLight,
  maxWidth,
}: {
  loc: string
  isLight: boolean
  maxWidth?: number
}) => (
  <span
    className={isLight ? jobstyles.light_side_profile_location : 'location-badge-design'}
    style={{
      whiteSpace: 'nowrap',
      flexShrink: 0,
      minWidth: 0,
      ...(maxWidth != null ? { maxWidth } : null),
    }}
  >
    <PinIcon isLight={isLight} />
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}
    >
      {loc}
    </span>
  </span>
)

// Larger chip used inside the modal (matches the mobile app's location pills).
const ModalLocationChip = ({ loc, isLight }: { loc: string; isLight: boolean }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      border: `1px solid ${isLight ? 'rgba(57,96,251,0.25)' : '#2E3E63'}`,
      background: isLight ? '#3960FB0D' : 'rgba(255,255,255,0.02)',
      color: isLight ? '#040F1F' : '#E2E8F0',
      borderRadius: 10,
      padding: '9px 14px',
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.1,
      fontFamily: 'var(--font-dm-sans)',
    }}
  >
    <PinIcon isLight={isLight} w={11} h={13} />
    {loc}
  </span>
)

interface JobLocationsProps {
  locations: string[]
  isLight: boolean
  /** Job title shown as the modal heading (matches the app). */
  title?: string
  /**
   * Hard upper bound on chips shown on the line before collapsing into "+N".
   * Defaults high so the real limit is how many physically fit on one line —
   * the row shows as many as fit (2, 3, or more) and collapses the rest.
   */
  maxVisible?: number
}

const JobLocations: React.FC<JobLocationsProps> = ({
  locations,
  isLight,
  title,
  maxVisible = 20,
}) => {
  const { resolvedTheme } = useTheme()
  const modalIsLight = resolvedTheme === 'light'

  const wrapRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // Conservative initial count for SSR / first paint; the layout effect below
  // re-measures and expands/contracts to whatever actually fits.
  const [visibleCount, setVisibleCount] = useState(
    Math.min(locations.length, 3)
  )
  // When non-null, the single visible chip is capped to this px width and its
  // label truncates with an ellipsis (lone over-long location edge case).
  const [truncateWidth, setTruncateWidth] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const chipClass = isLight
    ? jobstyles.light_side_profile_location
    : 'location-badge-design'

  const recompute = useCallback(() => {
    const wrap = wrapRef.current
    const measure = measureRef.current
    if (!wrap || !measure) return

    const available = wrap.clientWidth
    if (available <= 0) return

    const nodes = Array.from(measure.children) as HTMLElement[]
    const chipNodes = nodes.slice(0, locations.length)
    const badge = nodes[locations.length]
    const badgeW = badge ? badge.offsetWidth : 0
    if (chipNodes.length === 0) return

    const widths = chipNodes.map(n => n.offsetWidth)

    // 1) Every chip fits on one line (within the hard cap) → show them all,
    //    no "+N" badge, no truncation.
    let totalAll = 0
    for (let i = 0; i < widths.length; i++) {
      totalAll += widths[i] + (i > 0 ? GAP : 0)
    }
    if (locations.length <= maxVisible && totalAll <= available) {
      setVisibleCount(locations.length)
      setTruncateWidth(null)
      return
    }

    // 2) Greedily fit as many whole chips as the line holds, always reserving
    //    room for the "+N" badge, up to the hard cap.
    let used = 0
    let count = 0
    for (let i = 0; i < widths.length; i++) {
      const next = used + (count > 0 ? GAP : 0) + widths[i]
      if (next + GAP + badgeW <= available && count < maxVisible) {
        used = next
        count++
      } else {
        break
      }
    }

    // 3) Edge case: not even the first chip fits beside the badge. Show a single
    //    chip truncated with an ellipsis so it can never overflow the card.
    if (count === 0) {
      setVisibleCount(1)
      setTruncateWidth(
        locations.length === 1
          ? available // lone location: use the full line width
          : Math.max(0, available - badgeW - GAP) // reserve the "+N" badge
      )
      return
    }

    setVisibleCount(count)
    setTruncateWidth(null)
  }, [locations, maxVisible])

  useIsoLayoutEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => recompute())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [recompute])

  // Web fonts (DM Sans) load with `swap`, so the first measurement happens in
  // the fallback font. Re-measure once the real font is ready, otherwise the
  // fit count can be stale (off by a chip) near a boundary on cold loads.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) recompute()
    })
    return () => {
      cancelled = true
    }
  }, [recompute])

  // ESC + body-scroll lock while the modal is open.
  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [modalOpen])

  if (!locations || locations.length === 0) return null

  const hiddenCount = locations.length - visibleCount
  const shown = locations.slice(0, visibleCount)

  // Modal theme tokens.
  const panelBg = modalIsLight ? '#FFFFFF' : 'rgba(11, 22, 41, 0.98)'
  const textColor = modalIsLight ? '#040F1F' : '#FFFFFF'
  const mutedText = modalIsLight ? '#7A8499' : '#A0AEC0'
  const panelBorder: React.CSSProperties = modalIsLight
    ? { border: '1px solid rgba(160,174,192,0.4)', background: panelBg }
    : {
        border: '1px solid transparent',
        background: `linear-gradient(${panelBg}, ${panelBg}) padding-box, linear-gradient(135deg, rgba(84,51,255,0.6), rgba(32,189,255,0.6)) border-box`,
      }

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', minWidth: 0, overflow: 'hidden', position: 'relative' }}
    >
      {/* Hidden measurement layer: every chip + a badge sample, never wraps. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: GAP,
          left: -9999,
          top: 0,
        }}
      >
        {locations.map((loc, idx) => (
          <LocationChip key={idx} loc={loc} isLight={isLight} />
        ))}
        {/* fontWeight matches the visible "+N" badge below so badgeW isn't
            under-measured (the rendered badge is 600, the class is 500). */}
        <span className={chipClass} style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
          +{locations.length}
        </span>
      </div>

      {/* Visible single-line row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: GAP,
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {shown.map((loc, idx) => (
          <LocationChip
            key={idx}
            loc={loc}
            isLight={isLight}
            maxWidth={truncateWidth ?? undefined}
          />
        ))}
        {hiddenCount > 0 && (
          <span
            className={chipClass}
            role='button'
            tabIndex={0}
            onClick={e => {
              e.stopPropagation()
              setModalOpen(true)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                setModalOpen(true)
              }
            }}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            +{hiddenCount}
          </span>
        )}
      </div>

      {/* All-locations modal — portalled to <body> so it escapes any
          transformed / backdrop-filtered ancestor and centres on the viewport. */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role='dialog'
            aria-modal='true'
            aria-label='Job locations'
            onClick={e => {
              e.stopPropagation()
              setModalOpen(false)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)',
              padding: 16,
              cursor: 'default',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                maxHeight: '80vh',
                borderRadius: 22,
                boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'var(--font-dm-sans)',
                color: textColor,
                overflow: 'hidden',
                ...panelBorder,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '22px 24px 0',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: textColor,
                      fontFamily: 'var(--font-plus-jakarta)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {title || 'Locations'}
                  </h2>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: mutedText }}>
                    {locations.length} location{locations.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type='button'
                  aria-label='Close'
                  onClick={e => {
                    e.stopPropagation()
                    setModalOpen(false)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: textColor,
                    padding: 4,
                    marginTop: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Locations */}
              <div
                style={{
                  padding: '18px 24px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                {locations.map((loc, idx) => (
                  <ModalLocationChip key={idx} loc={loc} isLight={modalIsLight} />
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default JobLocations
