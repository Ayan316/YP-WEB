'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from '@/moduleCss/resources.module.css'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/context/ThemeContext'
import type { ResourceCategory } from '@/types/resources'

interface ResourceCategoryFilterProps {
  categories: ResourceCategory[]
  selected: string
  onSelect: (id: string) => void
  loading?: boolean
}

const SKELETON_WIDTHS = ['38%', '82%', '56%', '70%', '88%', '50%', '64%', '44%']

const ResourceCategoryFilter = ({
  categories,
  selected,
  onSelect,
  loading = false,
}: ResourceCategoryFilterProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open])

  const lightStyle = (active: boolean) =>
    isLight
      ? active
        ? { color: '#040F1F' }
        : { color: '#888888' }
      : undefined

  const isAll = selected === 'all'

  if (loading) {
    return (
      <div className={styles.category_nav_wrap}>
        <div className={styles.category_dropdown_trigger} aria-busy="true">
          <Skeleton
            className={styles.category_nav_skeleton}
            style={{ width: '45%', marginBottom: 0 }}
          />
          <ChevronDown size={18} className={styles.category_dropdown_chevron} />
        </div>

        <div
          className={`${styles.category_nav} ${styles.category_nav_closed}`}
          aria-busy="true"
          aria-label="Loading categories"
        >
          <div className={styles.category_nav_scroll}>
            {SKELETON_WIDTHS.map((width, i) => (
              <Skeleton
                key={i}
                className={styles.category_nav_skeleton}
                style={{ width }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleSelect = (id: string) => {
    onSelect(id)
    setOpen(false)
  }

  const selectedLabel = isAll
    ? 'All'
    : categories.find((cat) => cat.id === selected)?.category_name ?? 'All'

  return (
    <div className={styles.category_nav_wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.category_dropdown_trigger} ${
          open ? styles.category_dropdown_trigger_open : ''
        }`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={isLight ? { color: '#040F1F' } : undefined}
        suppressHydrationWarning
      >
        <span className={styles.category_dropdown_label}>{selectedLabel}</span>
        <ChevronDown
          size={18}
          className={`${styles.category_dropdown_chevron} ${
            open ? styles.category_dropdown_chevron_open : ''
          }`}
        />
      </button>

      <div
        className={`${styles.category_nav} ${
          open ? styles.category_nav_open : styles.category_nav_closed
        }`}
      >
        <div className={styles.category_nav_scroll}>
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`${styles.category_nav_btn} ${isAll ? styles.active : ''}`}
            style={lightStyle(isAll)}
            suppressHydrationWarning
          >
            All
          </button>

          {categories.map((cat) => {
            const active = selected === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={`${styles.category_nav_btn} ${active ? styles.active : ''}`}
                style={lightStyle(active)}
              >
                {cat.category_name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ResourceCategoryFilter
