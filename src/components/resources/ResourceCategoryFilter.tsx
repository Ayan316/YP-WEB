'use client'

import styles from '@/moduleCss/resources.module.css'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/context/ThemeContext'
import type { ResourceCategory } from '@/types/resources'

interface ResourceCategoryFilterProps {
  categories: ResourceCategory[]
  selected: string // 'all' or a masked category id
  onSelect: (id: string) => void
  /** Show a skeleton placeholder list while categories are loading. */
  loading?: boolean
}

// Deterministic widths so the server render and the client's first render
// agree (never Math.random() in an SSR path — it causes a hydration mismatch).
const SKELETON_WIDTHS = ['38%', '82%', '56%', '70%', '88%', '50%', '64%', '44%']

const ResourceCategoryFilter = ({
  categories,
  selected,
  onSelect,
  loading = false,
}: ResourceCategoryFilterProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const lightStyle = (active: boolean) =>
    isLight
      ? active
        ? { fontWeight: 600, color: '#040F1F' }
        : { color: '#888888' }
      : undefined

  const isAll = selected === 'all'

  if (loading) {
    return (
      <div
        className={styles.category_nav}
        aria-busy="true"
        aria-label="Loading categories"
      >
        {SKELETON_WIDTHS.map((width, i) => (
          <Skeleton
            key={i}
            className={styles.category_nav_skeleton}
            style={{ width }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.category_nav}>
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`${styles.category_nav_btn} ${isAll ? styles.active : ''}`}
        style={lightStyle(isAll)}
        // `selected` is restored from sessionStorage on the client (client-only)
        // so the active state differs from the SSR default. Recoverable.
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
            onClick={() => onSelect(cat.id)}
            className={`${styles.category_nav_btn} ${active ? styles.active : ''}`}
            style={lightStyle(active)}
          >
            {cat.category_name}
          </button>
        )
      })}
    </div>
  )
}

export default ResourceCategoryFilter
