'use client'

import React from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export interface FilterDropdownOption {
  label: string
  value: string
  count?: number
}

interface FilterDropdownProps {
  title: string
  options: FilterDropdownOption[]
  selectedValues: string[]
  onChange: (vals: string[]) => void
  disabled?: boolean
  icon?: React.ReactNode
  hideCount?: boolean
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  title,
  options,
  selectedValues,
  onChange,
  disabled = false,
  icon,
  hideCount = false,
}) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  const isLight = mounted && resolvedTheme === 'light'

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [pending, setPending] = React.useState<Set<string>>(
    () => new Set(selectedValues),
  )
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (open) {
      setPending(new Set(selectedValues))
      setQuery('')
    }
  }, [open, selectedValues])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const accent = isLight ? '#040F1F' : '#FFF'
  const accentTint = isLight ? 'rgba(53,111,238,0.08)' : 'rgba(32,189,255,0.08)'
  const accentBorder = isLight ? '#040F1F' : '#FFF'
  const panelBg = isLight ? '#F4F6FF' : 'rgba(29,47,71,1)'
  const triggerBg = isLight ? '#ffffff' : 'rgba(255,255,255,0.05)'
  const textColor = isLight ? '#040F1F' : '#FFFFFF'
  const mutedText = isLight ? '#7A8499' : '#A0AEC0'
  const borderColor = isLight ? 'rgba(160,174,192,0.5)' : 'rgba(255,255,255,0.18)'
  const rowHoverBg = isLight ? 'rgba(53,111,238,0.06)' : 'rgba(255,255,255,0.04)'

  const count = selectedValues.length
  const active = count > 0

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const toggle = (val: string) => {
    setPending(prev => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  const apply = () => {
    onChange(Array.from(pending))
    setOpen(false)
  }

  const reset = () => {
    setPending(new Set())
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 8,
          border: `0.5px solid ${active ? accentBorder : borderColor}`,
          background: active ? accentTint : triggerBg,
          color: active ? accent : textColor,
          fontFamily: 'var(--font-dm-sans)',
          fontWeight: 500,
          fontSize: 13,
          cursor: disabled || options.length === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled || options.length === 0 ? 0.6 : 1,
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', color: active ? accent : mutedText }}>
            {icon}
          </span>
        )}
        <span>{title}</span>
        {active && !hideCount && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: accent,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {count}
          </span>
        )}
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 50,
            minWidth: 260,
            maxWidth: 320,
            background: panelBg,
            border: isLight ? '1px solid rgba(160,174,192,0.5)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          <div style={{ padding: 10, borderBottom: `1px solid ${isLight ? 'rgba(160,174,192,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isLight ? 'rgba(160,174,192,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <Search size={14} color={mutedText} />
              <input
                aria-label={`Search ${title}`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: textColor,
                  fontSize: 13,
                  fontFamily: 'var(--font-dm-sans)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              padding: 6,
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 12px', fontSize: 13, color: mutedText, textAlign: 'center' }}>
                No options
              </div>
            ) : (
              filtered.map(opt => {
                const selected = pending.has(opt.value)
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggle(opt.value)}
                    onMouseEnter={e => {
                      if (!selected)
                        (e.currentTarget as HTMLDivElement).style.background = rowHoverBg
                    }}
                    onMouseLeave={e => {
                      if (!selected)
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
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
                        border: `1.5px solid ${selected ? accent : (isLight ? '#A0AEC0' : 'rgba(255,255,255,0.3)')}`,
                        background: selected ? accent : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {typeof opt.count === 'number' && (
                      <span style={{ fontSize: 11, color: mutedText }}>{opt.count}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
              gap: 8,
              borderTop: `1px solid ${isLight ? 'rgba(160,174,192,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'transparent',
                border: 'none',
                color: mutedText,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 10px',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={apply}
              style={{
                background: accent,
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: 8,
                fontFamily: 'var(--font-dm-sans)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Apply{pending.size > 0 ? ` (${pending.size})` : ''}
              {pending.size === 0 && <X size={0} style={{ display: 'none' }} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterDropdown
