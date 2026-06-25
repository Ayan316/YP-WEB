'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import styles from '@/moduleCss/resources.module.css'
import htmlStyles from '@/moduleCss/Renderhtmlcontent.module.css'

interface ResourceBodyProps {
  body: string | null
}

const ResourceBody = ({ body }: ResourceBodyProps) => {
  // Sanitize the raw HTML body before injecting it. DOMPurify needs a DOM, so
  // guard for SSR; this is a client component, but render nothing server-side.
  const sanitized = useMemo(() => {
    if (!body) return ''
    if (typeof window === 'undefined') return ''  

    // Strip inline color / background-color from all elements so the CSS
    // theme rules (dark → #fff, light → #333) aren't overridden by the
    // hardcoded Quill inline styles (e.g. color: rgb(17,17,17)).
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node instanceof HTMLElement && node.style) {
        node.style.removeProperty('color')
        node.style.removeProperty('background-color')
        node.style.removeProperty('background')
        // Remove empty style attribute to keep markup clean
        if (!node.getAttribute('style')?.trim()) {
          node.removeAttribute('style')
        }
      }
    })

    const clean = DOMPurify.sanitize(body)
    DOMPurify.removeHook('afterSanitizeAttributes')
    return clean
  }, [body])

  if (!body || !sanitized.trim()) return null

  return (
    <article id="resource-article" className={styles.detail_main}>
      <div
        className={`${styles.detail_body} ${htmlStyles.htmlContent}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </article>
  )
}

export default ResourceBody
