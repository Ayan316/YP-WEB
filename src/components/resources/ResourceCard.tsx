'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useRef, useLayoutEffect } from 'react'
import styles from '@/moduleCss/resources.module.css'
import { useTheme } from '@/context/ThemeContext'
import { getTimeAgoJobListing } from '@/helpers/dateFormatter'
import type { ResourceCategoryRef } from '@/types/resources'

// Classify a resource thumbnail by file extension so the card shows the right
// placeholder: a real image is rendered; audio/video URLs point at the raw
// media (not an image) so they get a themed icon placeholder; anything else or
// a missing URL falls back to a plain media icon.
type ResourceMediaType = 'image' | 'audio' | 'video' | 'pdf' | 'document' | null

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'heic', 'heif']
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'weba']
const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'ogv']
const DOCUMENT_EXTS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'csv']

const getResourceMediaType = (url: string | null): ResourceMediaType => {
  if (!url) return null
  try {
    const { pathname } = new URL(url)
    const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
    if (IMAGE_EXTS.includes(ext)) return 'image'
    if (AUDIO_EXTS.includes(ext)) return 'audio'
    if (VIDEO_EXTS.includes(ext)) return 'video'
    if (ext === 'pdf') return 'pdf'
    if (DOCUMENT_EXTS.includes(ext)) return 'document'
    return null
  } catch {
    return null
  }
}

// Visual treatment for each placeholder (shown when there's no real image
// thumbnail). Per-type gradient + accent + label, themed for light/dark.
type MediaVisualKey = 'video' | 'audio' | 'pdf' | 'document' | 'image' | 'resource'
type MediaIconKey =
  | 'play'
  | 'musical-notes'
  | 'document-text'
  | 'document'
  | 'image'
  | 'book'

interface MediaVisual {
  gradient: [string, string]
  icon: MediaIconKey
  label: string
  accent: string
}

const getMediaVisual = (key: MediaVisualKey, isDark: boolean): MediaVisual => {
  switch (key) {
    case 'video':
      return { gradient: isDark ? ['#2A0E1A', '#5B1228'] : ['#FFE4EA', '#FFC3D1'], icon: 'play', label: 'VIDEO', accent: '#FF3D71' }
    case 'audio':
      return { gradient: isDark ? ['#190F3A', '#3A1C73'] : ['#ECE6FF', '#D6C7FF'], icon: 'musical-notes', label: 'AUDIO', accent: '#9B6BFF' }
    case 'pdf':
      return { gradient: isDark ? ['#33140A', '#5E2410'] : ['#FFE7DC', '#FFCDB8'], icon: 'document-text', label: 'PDF', accent: '#FF6B3D' }
    case 'document':
      return { gradient: isDark ? ['#06243A', '#0C3E63'] : ['#DEEBFF', '#BFD9FF'], icon: 'document', label: 'DOCUMENT', accent: '#2E86FF' }
    case 'image':
      return { gradient: isDark ? ['#0A1628', '#162D50'] : ['#E0E7FF', '#C7D2FE'], icon: 'image', label: 'IMAGE', accent: '#20BCFF' }
    default:
      // No thumbnail / unknown type: show the resources book icon and no label.
      return { gradient: isDark ? ['#0A1628', '#1C2B57'] : ['#E6ECFF', '#CBD7FF'], icon: 'book', label: '', accent: '#5B6CFF' }
  }
}

// Inline SVGs for each icon key, tinted via `currentColor` (the accent color).
const renderMediaIcon = (icon: MediaIconKey) => {
  switch (icon) {
    case 'play':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'musical-notes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    case 'document-text':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      )
    case 'document':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )
    case 'image':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      )
    case 'book':
    default:
      // Resources book icon (matches public/images .../resources.svg).
      return (
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" aria-hidden="true">
          <path d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0 1 16 16v288a16 16 0 0 1-16 16c-128 0-177.45 25.81-208 64c-30.37-38-80-64-208-64c-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0 1 16-16c131.57.59 192 32.84 208 96m0 0v288" />
        </svg>
      )
  }
}

// Title + description block (new handover card behaviour):
//   - The TITLE is ALWAYS shown in FULL — never truncated.
//   - The DESCRIPTION clamps to 2 lines by default, dropping to 1 line
//     only when the (un-truncated) title wraps to MORE than 2 lines, so
//     a long-title card stays roughly the same height as its row-mates.
// The line count is measured per card and re-measured on resize.
const CardText = ({ title, description }: { title: string; description: string }) => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [descLines, setDescLines] = useState(2)

  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      if (!lh) return
      const lines = Math.round(el.scrollHeight / lh)
      setDescLines(lines > 2 ? 1 : 2)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [title])

  return (
    <>
      <h3 ref={titleRef} className={styles.r_title}>
        {title}
      </h3>
      {description && (
        <p className={styles.r_excerpt} style={{ WebkitLineClamp: String(descLines) }}>
          {description}
        </p>
      )}
    </>
  )
}

interface ResourceCardProps {
  id: string
  title: string
  excerpt: string
  thumbnail_url: string | null
  media_count: number
  is_featured: boolean
  published_at: string | null
  created_at: string | null
  category: ResourceCategoryRef
  onBeforeNavigate?: () => void
}

const ResourceCard = ({
  id,
  title,
  excerpt,
  thumbnail_url,
  media_count,
  published_at,
  created_at,
  category,
  onBeforeNavigate,
}: ResourceCardProps) => {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const [imageFailed, setImageFailed] = useState(false)

  // Decide what the thumbnail area shows based on the media type of the URL.
  const mediaType = getResourceMediaType(thumbnail_url)
  // Render the <Image> only for actual image thumbnails that haven't failed;
  // audio/video URLs are raw media (not images) and use a placeholder instead.
  const imageUrl =
    mediaType === 'image' && thumbnail_url && !imageFailed ? thumbnail_url : null

  const ytThumbId = (() => {
    if (!imageUrl) return null
    try {
      const u = new URL(imageUrl)
      const host = u.hostname.toLowerCase()
      if (host !== 'img.youtube.com' && !host.endsWith('ytimg.com')) return null
      const parts = u.pathname.split('/').filter(Boolean)
      const viIndex = parts.indexOf('vi')
      return viIndex >= 0 && parts[viIndex + 1] ? parts[viIndex + 1] : null
    } catch {
      return null
    }
  })()

  // Placeholder visual (gradient/accent/icon/label) for anything that isn't a
  // live image: audio, video, pdf, document, a failed image, or no thumbnail.
  const visual = getMediaVisual((mediaType ?? 'resource') as MediaVisualKey, isDark)
  // Mirrors the app: glyph + label are white in dark mode, accent in light.
  const glyphColor = isDark ? '#ffffff' : visual.accent

  // Prefer published_at, falling back to created_at when it's absent.
  const dateSource = published_at ?? created_at
  const formattedDate = dateSource ? getTimeAgoJobListing(dateSource) : null

  const handleCardClick = () => {
    onBeforeNavigate?.()
    // IMPORTANT: never call the detail endpoint here — it increments
    // view_count. Plain navigation only.
    router.push(`/resources/${id}`)
  }

  return (
    <div className={styles.r_card} onClick={handleCardClick}>
      <div className={`${styles.r_media}${ytThumbId ? ` ${styles.r_media_yt}` : ''}`}>
        {imageUrl ? (
          <>
            {ytThumbId && (
              <div
                className={styles.r_media_blur}
                style={{ backgroundImage: `url(${imageUrl})` }}
                aria-hidden="true"
              />
            )}
            <Image
              src={imageUrl}
              alt={title}
              fill
              unoptimized
              onError={() => setImageFailed(true)}
            />
            {ytThumbId && (
              <span className={styles.r_media_play} aria-hidden="true">
                <svg viewBox="0 0 68 48">
                  <path
                    d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                    fill="#f00"
                  />
                  <path d="M45 24 27 14v20z" fill="#fff" />
                </svg>
              </span>
            )}
          </>
        ) : (
          // No live image — render the per-type placeholder, mirroring the
          // mobile app: gradient + two glow blobs (white top-left, accent
          // bottom-right) + a large faint ghost glyph + a glass tile with the
          // glyph and a type label.
          <div
            className={styles.r_media_fallback}
            style={{
              background: `linear-gradient(to bottom right, ${visual.gradient[0]} 0%, ${visual.gradient[1]} 100%)`,
            }}
          >
            {/* Decorative glow blobs (flat circles, like the app). */}
            <span
              className={styles.r_glow_top}
              style={{
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.55)',
              }}
              aria-hidden="true"
            />
            <span
              className={styles.r_glow_bottom}
              style={{ backgroundColor: `${visual.accent}2E` }}
              aria-hidden="true"
            />
            {/* Oversized faint glyph behind the tile for texture. */}
            <span
              className={styles.r_ghost_glyph}
              style={{
                color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
              }}
              aria-hidden="true"
            >
              {renderMediaIcon(visual.icon)}
            </span>
            {/* Centre: glass tile + glyph + type label. */}
            <span
              className={styles.r_glass_tile}
              style={{
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(255,255,255,0.62)',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.20)'
                  : 'rgba(255,255,255,0.9)',
                color: glyphColor,
              }}
            >
              {renderMediaIcon(visual.icon)}
            </span>
            {visual.label && (
              <span
                className={styles.r_media_fallback_label}
                style={{ color: glyphColor }}
              >
                {visual.label}
              </span>
            )}
          </div>
        )}

        {formattedDate && (
          <span className={styles.r_date_chip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {formattedDate}
          </span>
        )}
      </div>

      <div className={styles.r_body}>
        {category?.category_name && (
          <span className={styles.r_category} title={category.category_name}>
            {category.category_name}
          </span>
        )}
        <CardText title={title} description={excerpt} />
      </div>
    </div>
  )
}

export default ResourceCard
