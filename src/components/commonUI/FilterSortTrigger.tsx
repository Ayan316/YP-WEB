'use client'

import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export interface FilterSortTriggerProps {
  count?: number
  onClick: () => void
  label?: string
}

const FilterSortTrigger: React.FC<FilterSortTriggerProps> = ({
  count = 0,
  onClick,
  label = 'Filter',
}) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  const isLight = mounted && resolvedTheme === 'light'

  const accent = '#356FEE'
  const accentTint = 'rgba(53,111,238,0.10)'
  const accentBorder = 'rgba(53,111,238,0.55)'
  const idleText = isLight ? '#040F1F' : '#FFFFFF'
  const idleBorder = isLight ? 'rgba(160,174,192,0.5)' : 'rgba(255,255,255,0.18)'

  const active = count > 0
  const fg = active ? accent : idleText
  const borderColor = active ? accentBorder : idleBorder
  const bg = active ? accentTint : 'transparent'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 8,
        border: `0.8px solid ${borderColor}`,
        background: bg,
        color: fg,
        fontFamily: 'var(--font-dm-sans)',
        fontWeight: 500,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: fg,
        }}
      >
        <SlidersHorizontal size={14} />
      </span>
      <span>{label}</span>
      {active && (
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
    </button>
  )
}

export default FilterSortTrigger
