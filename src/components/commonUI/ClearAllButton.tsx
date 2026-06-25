'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface ClearAllButtonProps {
  onClick: () => void
  visible?: boolean
  count?: number
  label?: string
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({
  onClick,
  visible = true,
  count,
  label = 'Clear All',
}) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  const isLight = mounted && resolvedTheme === 'light'

  if (!visible) return null

  const bg = isLight ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)'
  const textColor = isLight ? '#dc2626' : '#f87171'
  const borderColor = 'rgba(239,68,68,0.3)'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 8,
        border: `0.5px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontFamily: 'var(--font-dm-sans)',
        fontWeight: 500,
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
      }}
    >
      <X size={14} />
      <span>
        {label}
        {typeof count === 'number' && count > 0 ? ` (${count})` : ''}
      </span>
    </button>
  )
}

export default ClearAllButton
