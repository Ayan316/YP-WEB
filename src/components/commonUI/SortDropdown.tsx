'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, ArrowUpDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { SortPillGroup } from './SortByPills'

interface SortDropdownProps {
  title?: string
  groups: SortPillGroup[]
  value: string
  onChange: (v: string) => void
}

const SortDropdown: React.FC<SortDropdownProps> = ({
  title = 'Sort',
  groups,
  value,
  onChange,
}) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  const isLight = mounted && resolvedTheme === 'light'

  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number } | null>(null)

  const updatePanelPos = React.useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setPanelPos({ top: rect.bottom + 8, left: rect.left })
  }, [])

  React.useEffect(() => {
    if (!open) return
    updatePanelPos()
    const onScroll = () => updatePanelPos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updatePanelPos])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const accent = isLight ? '#356FEE' : '#20BDFF'
  const accentTint = isLight ? 'rgba(53,111,238,0.08)' : 'rgba(32,189,255,0.08)'
  const panelBg = isLight ? '#F4F6FF' : 'rgba(29,47,71,1)'
  const triggerBg = isLight ? '#ffffff' : 'rgba(255,255,255,0.05)'
  const textColor = isLight ? '#040F1F' : '#FFFFFF'
  const mutedText = isLight ? '#7A8499' : '#A0AEC0'
  const borderColor = isLight ? 'rgba(160,174,192,0.5)' : 'rgba(255,255,255,0.18)'
  const rowHoverBg = isLight ? 'rgba(53,111,238,0.06)' : 'rgba(255,255,255,0.04)'

  let currentLabel: string | undefined
  for (const g of groups) {
    const found = g.options.find(o => o.value === value)
    if (found) {
      currentLabel = found.label
      break
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 8,
          border: `0.5px solid ${borderColor}`,
          background: triggerBg,
          color: textColor,
          fontFamily: 'var(--font-dm-sans)',
          fontWeight: 500,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
      >
        <ArrowUpDown size={14} color={mutedText} />
        <span>
          {title}
          {currentLabel ? `: ${currentLabel}` : ''}
        </span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && mounted && panelPos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          style={{
            position: 'fixed',
            top: panelPos.top,
            left: panelPos.left,
            zIndex: 9999,
            minWidth: 220,
            background: panelBg,
            border: isLight ? '1px solid rgba(160,174,192,0.5)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxHeight: 320,
            overflowY: 'auto',
            padding: 6,
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {groups.map((group, gi) => (
            <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 6 }}>
              <div
                style={{
                  padding: '6px 10px 4px',
                  fontSize: 10,
                  letterSpacing: '0.10em',
                  fontWeight: 600,
                  color: mutedText,
                  textTransform: 'capitalize',
                }}
              >
                {group.label}
              </div>
              {group.options.map(opt => {
                const active = opt.value === value
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLDivElement).style.background = rowHoverBg
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: active ? accentTint : 'transparent',
                      color: active ? accent : textColor,
                      fontSize: 13,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {opt.icon && (
                      <span style={{ display: 'inline-flex', color: active ? accent : mutedText }}>
                        {opt.icon}
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {active && <Check size={14} color={accent} strokeWidth={3} />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default SortDropdown
