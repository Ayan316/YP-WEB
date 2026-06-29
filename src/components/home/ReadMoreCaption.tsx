'use client'

import { useState, useMemo } from 'react'
import styles from '@/moduleCss/feeds.module.css'
import { useTheme } from '@/context/ThemeContext'

interface ReadMoreCaptionProps {
  content: string
  wordLimit?: number
}

const ReadMoreCaption: React.FC<ReadMoreCaptionProps> = ({
  content,
  wordLimit = 20,

}) => {
  const [isExpanded, setIsExpanded] = useState(false)
    const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  // Extract plain text from HTML
  const getPlainText = (html: string): string => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const plainText = useMemo(() => getPlainText(content), [content])
  
  // Count words
  const wordCount = useMemo(
    () => plainText.split(/\s+/).filter(w => w.length > 0).length,
    [plainText]
  )
  
  const shouldShowReadMore = wordCount > wordLimit

  // Truncate by counting words as we traverse the HTML
  const getTruncatedContent = (): string => {
    if (!shouldShowReadMore) return content

    let wordCount = 0
    let inTag = false
    let inWord = false
    let htmlResult = ''

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (char === '<') {
        // Finish current word before entering tag
        if (inWord) {
          wordCount++
          inWord = false
        }
        inTag = true
        htmlResult += char
      } else if (char === '>') {
        inTag = false
        htmlResult += char
      } else if (inTag) {
        htmlResult += char
      } else {
        // Text content outside tags
        if (/\S/.test(char)) {
          inWord = true
          htmlResult += char
        } else {
          // Whitespace — end of word
          if (inWord) {
            wordCount++
            inWord = false
            if (wordCount >= wordLimit) break
          }
          htmlResult += char
        }
      }
    }

    // Close any open tags (p, div)
    const closeTags = (tag: string) => {
      const openCount = (htmlResult.match(new RegExp(`<${tag}[^>]*>`, 'g')) || []).length
      const closeCount = (htmlResult.match(new RegExp(`</${tag}>`, 'g')) || []).length
      for (let j = 0; j < openCount - closeCount; j++) {
        htmlResult += `</${tag}>`
      }
    }

    closeTags('p')
    closeTags('div')

    return htmlResult
  }

  const displayContent = isExpanded ? content : getTruncatedContent()

  return (
    <div className={styles.feed_post_item_body_caption_wrapper}>
      <div
        className={styles.feed_post_item_body_caption}
        dangerouslySetInnerHTML={{ __html: displayContent }}
        style={isLight ? { color: '#040F1F' } : undefined}
      />
      {shouldShowReadMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.feed_post_item_body_read_more}
        >
          {isExpanded ? 'show less' : `...${" "}show more`}
        </button>
      )}
    </div>
  )
}

export default ReadMoreCaption