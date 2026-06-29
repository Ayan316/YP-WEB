'use client'

import { useState, useMemo } from 'react'
import DOMPurify from 'dompurify'
import styles from '@/moduleCss/events.module.css'
import htmlStyles from '@/moduleCss/Renderhtmlcontent.module.css'
import { useTheme } from '@/context/ThemeContext'

interface EventDescriptionSectionProps {
  description: string
}

const MAX_PLAIN_LENGTH = 300

function truncateHtml(html: string, maxTextLength: number): { truncated: string; isLong: boolean } {
  // Strip HTML tags to get plain text
  const plainText = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()

  if (plainText.length <= maxTextLength) {
    return { truncated: html, isLong: false }
  }

  // Walk through HTML, counting only visible text characters
  let textCount = 0
  let cutIndex = 0
  let inTag = false

  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      inTag = true
    } else if (html[i] === '>') {
      inTag = false
    } else if (!inTag) {
      // Skip HTML entities as single character
      if (html[i] === '&') {
        const semiIndex = html.indexOf(';', i)
        if (semiIndex !== -1 && semiIndex - i < 10) {
          textCount++
          if (textCount >= maxTextLength) {
            cutIndex = semiIndex + 1
            break
          }
          i = semiIndex
          continue
        }
      }
      textCount++
      if (textCount >= maxTextLength) {
        cutIndex = i + 1
        break
      }
    }
  }

  // Close any open tags
  const openTags: string[] = []
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g
  let match
  const sliced = html.slice(0, cutIndex)
  while ((match = tagRegex.exec(sliced)) !== null) {
    if (match[0].startsWith('</')) {
      openTags.pop()
    } else if (!match[0].endsWith('/>')) {
      openTags.push(match[1])
    }
  }

  const closingTags = openTags.reverse().map(tag => `</${tag}>`).join('')
  return { truncated: sliced + ' ..' + closingTags, isLong: true }
}

const EventDescriptionSection = ({ description }: EventDescriptionSectionProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [expanded, setExpanded] = useState(false)

  const { truncated, isLong } = useMemo(() => truncateHtml(description, MAX_PLAIN_LENGTH), [description])
  const rawHtml = expanded || !isLong ? description : truncated

  const displayHtml = useMemo(() => {
    if (!rawHtml) return ''
    if (typeof window === 'undefined') return ''

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node instanceof HTMLElement && node.style) {
        node.style.removeProperty('color')
        node.style.removeProperty('background-color')
        node.style.removeProperty('background')
        if (!node.getAttribute('style')?.trim()) {
          node.removeAttribute('style')
        }
      }
    })

    const clean = DOMPurify.sanitize(rawHtml)
    DOMPurify.removeHook('afterSanitizeAttributes')
    return clean
  }, [rawHtml])

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
        Event Description
      </h3>

      <div
        className={styles.ed_divider}
        style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)' }}
      />

      <div
        className={`${styles.ed_description_text} ${htmlStyles.htmlContent}`}
        style={{ color: isLight ? '#555' : '#a0aec0' }}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={styles.ed_read_more_btn}
          style={{ color: isLight ? '#356FEE' : '#06c1fa' }}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  )
}

export default EventDescriptionSection
