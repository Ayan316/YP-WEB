'use client'

import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'

interface EventKeywordSectionProps {
  keywords: string[]
}

const EventKeywordSection = ({ keywords }: EventKeywordSectionProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  if (!keywords || keywords.length === 0) return null

  return (
    <div
      className={styles.ed_section_card}
      style={{
        background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.33)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
      }}
    >
      <h3
        className={styles.ed_section_heading}
        style={{ color: isLight ? '#040F1F' : '#ffffff' }}
      >
        Keywords
      </h3>

      <div
        className={styles.ed_divider}
        style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)' }}
      />

      <div className={styles.ed_keywords_list}>
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className={styles.ed_keyword_pill}
            style={{
              color: isLight ? '#555' : '#a0aec0',
              borderColor: isLight ? '#d1d5db' : 'rgba(160, 174, 192, 0.4)',
            }}
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  )
}

export default EventKeywordSection
