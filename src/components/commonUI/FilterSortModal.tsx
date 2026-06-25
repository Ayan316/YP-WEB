'use client'

import React from 'react'
import { X, Search, Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export interface FilterSection {
  key: string
  title: string
  icon?: React.ReactNode
  options: { label: string; value: string; count?: number }[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export interface FilterSortModalProps {
  open: boolean
  onClose: () => void
  filters: FilterSection[]
  title?: string
  /** Kept for backwards compatibility — no longer used. */
  defaultSortValue?: string
}

const FilterSortModal: React.FC<FilterSortModalProps> = ({
  open,
  onClose,
  filters,
  title = 'Filter',
}) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  const isLight = mounted && resolvedTheme === 'light'

  const accent = isLight ? '#356FEE' : '#20BDFF'
  const accentTint = isLight ? 'rgba(53,111,238,0.08)' : 'rgba(32,189,255,0.08)'
  const panelBg = isLight ? '#FFFFFF' : 'rgba(13, 26, 50, 1)'
  const subBg = isLight ? '#F4F6FF' : 'rgba(255,255,255,0.04)'
  const textColor = isLight ? '#040F1F' : '#FFFFFF'
  const mutedText = isLight ? '#7A8499' : '#A0AEC0'
  const borderColor = isLight ? 'rgba(160,174,192,0.5)' : 'rgba(255,255,255,0.18)'
  const subtleBorder = isLight ? 'rgba(160,174,192,0.3)' : 'rgba(255,255,255,0.08)'
  const rowHoverBg = isLight ? 'rgba(53,111,238,0.06)' : 'rgba(255,255,255,0.04)'

  const [pending, setPending] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(filters.map(f => [f.key, f.selectedValues])),
  )
  const [queries, setQueries] = React.useState<Record<string, string>>({})

  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null)

  // Reseed on open
  React.useEffect(() => {
    if (open) {
      setPending(Object.fromEntries(filters.map(f => [f.key, f.selectedValues])))
      setQueries({})
      setTimeout(() => closeBtnRef.current?.focus(), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ESC + body scroll lock
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const applyCount = filters.reduce(
    (sum, f) => sum + (pending[f.key]?.length ?? 0),
    0,
  )
  const hasAnyPending = applyCount > 0
  const hasPendingDiff = filters.some(f => {
    const next = pending[f.key] ?? []
    const prev = f.selectedValues
    return next.length !== prev.length || next.some(v => !prev.includes(v))
  })

  const handleApply = () => {
    filters.forEach(f => {
      const next = pending[f.key] ?? []
      const prev = f.selectedValues
      const changed =
        next.length !== prev.length || next.some(v => !prev.includes(v))
      if (changed) f.onChange(next)
    })
    onClose()
  }

  const handleClearAll = () => {
    setPending(Object.fromEntries(filters.map(f => [f.key, []])))
  }

  const toggleFilterValue = (key: string, value: string) => {
    setPending(prev => {
      const current = prev[key] ?? []
      const exists = current.includes(value)
      return {
        ...prev,
        [key]: exists ? current.filter(v => v !== value) : [...current, value],
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-sort-modal-title"
      onClick={onClose}
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
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1180,
          maxHeight: '85vh',
          background: panelBg,
          borderRadius: 16,
          border: `0.5px solid ${borderColor}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-dm-sans)',
          color: textColor,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${subtleBorder}`,
          }}
        >
          <h2
            id="filter-sort-modal-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: textColor,
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: textColor,
              padding: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Filters grid (all filters on one row on desktop, wraps on small) */}
          {filters.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {filters.map(section => {
                const sel = pending[section.key] ?? []
                const q = (queries[section.key] ?? '').trim().toLowerCase()
                const filteredOpts = q
                  ? section.options.filter(o => o.label.toLowerCase().includes(q))
                  : section.options
                return (
                  <div
                    key={section.key}
                    style={{
                      border: `1px solid ${subtleBorder}`,
                      borderRadius: 12,
                      background: subBg,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                    }}
                  >
                    {/* Section header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      {section.icon && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: mutedText,
                          }}
                        >
                          {section.icon}
                        </span>
                      )}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 600,
                          color: textColor,
                        }}
                      >
                        {section.title}
                      </span>
                      {sel.length > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 20,
                            height: 20,
                            padding: '0 6px',
                            borderRadius: 10,
                            background: accent,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {sel.length}
                        </span>
                      )}
                    </div>

                    {/* Search */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isLight ? 'rgba(160,174,192,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        marginBottom: 8,
                      }}
                    >
                      <Search size={14} color={mutedText} />
                      <input
                        aria-label={`Search ${section.title}`}
                        value={queries[section.key] ?? ''}
                        onChange={e =>
                          setQueries(prev => ({ ...prev, [section.key]: e.target.value }))
                        }
                        placeholder={`Search ${section.title.toLowerCase()}...`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: textColor,
                          fontSize: 13,
                          fontFamily: 'var(--font-dm-sans)',
                        }}
                      />
                    </div>

                    {/* Options */}
                    <div
                      style={{
                        maxHeight: 220,
                        minHeight: 100,
                        overflowY: 'auto',
                      }}
                    >
                      {filteredOpts.length === 0 ? (
                        <div
                          style={{
                            padding: '14px 12px',
                            fontSize: 13,
                            color: mutedText,
                            textAlign: 'center',
                          }}
                        >
                          No options
                        </div>
                      ) : (
                        filteredOpts.map(opt => {
                          const selected = sel.includes(opt.value)
                          return (
                            <div
                              key={opt.value}
                              role="option"
                              aria-selected={selected}
                              onClick={() => toggleFilterValue(section.key, opt.value)}
                              onMouseEnter={e => {
                                if (!selected)
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    rowHoverBg
                              }}
                              onMouseLeave={e => {
                                if (!selected)
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    'transparent'
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '7px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background: selected ? accentTint : 'transparent',
                                color: selected ? accent : textColor,
                                fontSize: 13,
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <span
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  border: `1.5px solid ${
                                    selected
                                      ? accent
                                      : isLight
                                      ? '#A0AEC0'
                                      : 'rgba(255,255,255,0.3)'
                                  }`,
                                  background: selected ? accent : 'transparent',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {opt.label}
                              </span>
                              {typeof opt.count === 'number' && (
                                <span style={{ fontSize: 11, color: mutedText }}>
                                  {opt.count}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: `1px solid ${subtleBorder}`,
            gap: 12,
          }}
        >
          <div>
            {hasAnyPending && (
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  background: accent,
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontFamily: 'var(--font-dm-sans)',
                  transition: 'all 0.2s ease',
                }}
              >
                Clear All
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasPendingDiff}
            style={{
              background: !hasPendingDiff ? (isLight ? '#C9D0E0' : 'rgba(255,255,255,0.1)') : accent,
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: !hasPendingDiff ? 'not-allowed' : 'pointer',
              padding: '10px 18px',
              borderRadius: 8,
              fontFamily: 'var(--font-dm-sans)',
              opacity: !hasPendingDiff ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterSortModal
