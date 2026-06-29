'use client'

/**

 *
 * Functionality is UNCHANGED from this app: data comes from the existing
 * React-Query `getResourceDetail` server action, the HTML body is still
 * DOMPurify-sanitised (inline colours stripped so the theme rules win),
 * and back navigation uses `router.back()` so the list page's scroll /
 * filter state is restored.
 *
 * Theming: the ported CSS module keys dark mode off `[data-theme="dark"]`
 * (default = light), so the root wrapper carries `data-theme={resolvedTheme}`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { AiOutlineYoutube } from 'react-icons/ai'
import { useTheme } from '@/context/ThemeContext'
import { getResourceDetail } from '@/services/resources.services'
import FullScreenMediaModal from '@/components/commonUI/FullScreenMediaModal'
import ResourceVideoEmbed from '@/components/resources/ResourceVideoEmbed'
import styles from '@/moduleCss/resourceDetail.module.css'
import type {
  ResourceDetail,
  ResourceEnvelope,
  ResourceMediaType,
} from '@/types/resources'

type Props = { id: string }

/* Pre-computed pseudo-random heights for the 60-bar waveform. */
const WAVEFORM_HEIGHTS = [
  35, 55, 78, 92, 65, 80, 95, 60, 45, 70,
  85, 50, 95, 60, 35, 75, 90, 55, 65, 80,
  45, 95, 70, 55, 85, 60, 40, 75, 90, 50,
  65, 80, 55, 95, 70, 45, 85, 60, 75, 50,
  40, 88, 62, 78, 50, 92, 68, 45, 82, 58,
  72, 90, 55, 65, 85, 48, 95, 70, 60, 75,
]

type SlideKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'youtube'


function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const raw = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_STORAGE_URL || ''}${url}`
  try {
    new URL(raw)
    return raw
  } catch {
    return null
  }
}

/* Infer a media type from a URL when the backend leaves `media_type`
   blank — mirrors the handover's deriveMediaType. */
function deriveMediaType(url: string | null | undefined): SlideKind {
  if (!url) return 'document'
  const lower = url.toLowerCase()
  if (lower.includes('/audio/')) return 'audio'
  if (lower.includes('/videos/') || lower.includes('/video/')) return 'video'
  if (lower.includes('/images/') || lower.includes('/image/')) return 'image'
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(lower)) return 'audio'
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(lower)) return 'video'
  if (/\.(webp|jpe?g|png|gif|avif|svg)(\?|$)/i.test(lower)) return 'image'
  if (/\.pdf(\?|$)/i.test(lower)) return 'pdf'
  return 'document'
}

function coerceKind(raw: ResourceMediaType, url: string): SlideKind {
  const norm = (raw || '').toLowerCase().trim()
  if (norm === 'image' || norm === 'audio' || norm === 'video' || norm === 'pdf' || norm === 'document' || norm === 'youtube') {
    return norm
  }
  return deriveMediaType(url)
}

/* "2026-06-18T..." → "18 Jun, 2026". */
function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} ${months[d.getMonth()]}, ${d.getFullYear()}`
}

/* Auto-linkify URL-like text inside a backend-shipped HTML string so
   bare domains ("Apprenticeships.co.uk") render as clickable links.
   Ported verbatim from the handover; SSR-safe (returns input unchanged
   when there's no DOM). */
function linkifyHtml(html: string): string {
  if (!html) return html
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html

  const TLD =
    '(?:co\\.uk|ac\\.uk|gov\\.uk|org\\.uk|com|org|net|io|edu|gov|info|biz|app|ai|dev|tech|uk|us|ca|de|fr|jp|in|au|nz|eu|tv|me)'
  const URL_RE = new RegExp(
    'https?:\\/\\/[^\\s<>"\')]+' +
      '|' +
      'www\\.[A-Za-z0-9][\\w.-]*\\.' +
      TLD +
      '(?:\\/[^\\s<>"\')]*)?' +
      '|' +
      '\\b[A-Za-z][A-Za-z0-9-]{1,}(?:\\.' +
      TLD +
      ')\\b(?:\\/[^\\s<>"\')]*)?',
    'gi'
  )
  const SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'])

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode
      while (p && p !== doc.body) {
        if (p.nodeType === 1 && SKIP_TAGS.has((p as Element).tagName)) {
          return NodeFilter.FILTER_REJECT
        }
        p = p.parentNode
      }
      return URL_RE.test(node.textContent ?? '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    },
  })

  const targets: Text[] = []
  let n: Node | null = walker.nextNode()
  while (n) {
    targets.push(n as Text)
    n = walker.nextNode()
  }

  for (const text of targets) {
    const str = text.textContent ?? ''
    URL_RE.lastIndex = 0
    const frag = doc.createDocumentFragment()
    let lastIdx = 0
    let m: RegExpExecArray | null
    while ((m = URL_RE.exec(str)) !== null) {
      const matched = m[0]
      const start = m.index
      const cleanMatch = matched.replace(/[.,;:!?)]+$/, '')
      const trailing = matched.slice(cleanMatch.length)
      if (start > lastIdx) frag.appendChild(doc.createTextNode(str.slice(lastIdx, start)))
      let href = cleanMatch
      if (!/^https?:\/\//i.test(href)) href = 'https://' + href.replace(/^www\./i, '')
      const a = doc.createElement('a')
      a.setAttribute('href', href)
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
      a.textContent = cleanMatch
      frag.appendChild(a)
      if (trailing) frag.appendChild(doc.createTextNode(trailing))
      lastIdx = start + matched.length
    }
    if (lastIdx < str.length) frag.appendChild(doc.createTextNode(str.slice(lastIdx)))
    text.parentNode?.replaceChild(frag, text)
  }

  return doc.body.innerHTML
}

/* Sanitise (strip inline colours so theme rules win — kept from this
   app's ResourceBody) then linkify. Client-only. */
function sanitizeAndLinkify(body: string | null): string {
  if (!body) return ''
  if (typeof window === 'undefined') return ''
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLElement && node.style) {
      node.style.removeProperty('color')
      node.style.removeProperty('background-color')
      node.style.removeProperty('background')
      if (!node.getAttribute('style')?.trim()) node.removeAttribute('style')
    }
  })
  const clean = DOMPurify.sanitize(body, { ADD_ATTR: ['target', 'rel'] })
  DOMPurify.removeHook('afterSanitizeAttributes')
  return linkifyHtml(clean)
}

/* ── Custom waveform audio player ───────────────────────────────────── */
function AudioPlayer({ src, active = true }: { src: string; active?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoadedMetadata = () => setDuration(audio.duration || 0)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    if (active) return
    const audio = audioRef.current
    if (audio && !audio.paused) audio.pause()
  }, [active])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  function handleWaveformSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(duration) || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
  }

  function seekToClientX(clientX: number) {
    const el = progressRef.current
    const audio = audioRef.current
    if (!el || !audio || !Number.isFinite(duration) || duration <= 0) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const t = ratio * duration
    audio.currentTime = t
    setCurrentTime(t)
  }

  function handleProgressPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    seekToClientX(e.clientX)
    const onMove = (ev: PointerEvent) => seekToClientX(ev.clientX)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className={styles.audioPlayer}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className={styles.audioTopRow}>
        <div className={styles.audioMusicBox} aria-hidden="true" />
        <div className={styles.audioLabelWaveform}>
          <div className={styles.audioLabel}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="8" cy="18" r="4" />
              <path d="M12 18V2l7 4" />
            </svg>
            <span>Audio</span>
          </div>
          <div
            className={styles.audioWaveform}
            onClick={handleWaveformSeek}
            role="slider"
            aria-label="Seek audio position (waveform)"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            {WAVEFORM_HEIGHTS.map((h, i) => {
              const isPlayed = i / WAVEFORM_HEIGHTS.length < progress
              return (
                <span
                  key={i}
                  className={`${styles.waveformBar} ${isPlayed ? styles.waveformBarPlayed : ''}`}
                  style={{ height: `${h}%` }}
                />
              )
            })}
          </div>
          <div
            ref={progressRef}
            className={styles.audioProgressBar}
            onPointerDown={handleProgressPointerDown}
            role="slider"
            aria-label="Seek audio position"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div className={styles.audioProgressFill} style={{ width: `${progress * 100}%` }} />
            <div className={styles.audioProgressHandle} style={{ left: `${progress * 100}%` }} />
          </div>
          <div className={styles.audioBottomRow}>
            <span className={styles.audioBottomTime}>{formatTime(currentTime)}</span>
            <button
              type="button"
              className={styles.audioPlayBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4.5" width="4" height="15" rx="1" />
                  <rect x="14" y="4.5" width="4" height="15" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
                </svg>
              )}
            </button>
            <span className={styles.audioBottomTime}>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Custom video player ────────────────────────────────────────────── */
function VideoPlayer({ src, title, active = true }: { src: string; title?: string; active?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [videoAspect, setVideoAspect] = useState<number | null>(null)
  const [mediaWidth, setMediaWidth] = useState<number | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onLoaded = () => {
      setDuration(v.duration || 0)
      if (v.videoWidth && v.videoHeight) setVideoAspect(v.videoWidth / v.videoHeight)
    }
    const onTime = () => setCurrentTime(v.currentTime || 0)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onVol = () => setIsMuted(v.muted)
    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', onEnded)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('volumechange', onVol)
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('volumechange', onVol)
    }
  }, [])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPlaybackRate(1)
    setVideoAspect(null)
    setMediaWidth(null)
  }, [src])

  useEffect(() => {
    const v = videoRef.current
    if (v && !v.paused) v.pause()
  }, [active])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !videoAspect) {
      setMediaWidth(null)
      return
    }
    const compute = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (!cw || !ch) return
      const containerAspect = cw / ch
      const displayed = videoAspect >= containerAspect ? cw : ch * videoAspect
      setMediaWidth(Math.round(displayed))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [videoAspect])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  function skip(deltaSec: number) {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + deltaSec))
  }

  function handleProgressSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v || !Number.isFinite(duration) || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = ratio * duration
  }

  function cycleRate() {
    const rates = [1, 1.25, 1.5, 2]
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
    setPlaybackRate(next)
    const v = videoRef.current
    if (v) v.playbackRate = next
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function nudgeShow() {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 2500)
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div
      ref={containerRef}
      className={`${styles.videoPlayer} ${showControls ? styles.videoPlayerActive : ''}`}
      onMouseMove={nudgeShow}
      onMouseEnter={nudgeShow}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false)
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className={styles.videoEl}
        src={src}
        playsInline
        preload="metadata"
        title={title}
        onClick={togglePlay}
      />

      <div className={styles.videoCenterControls}>
        <button type="button" className={styles.videoSkipBtn} onClick={() => skip(-10)} aria-label="Skip back 10 seconds">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M10 16l4-6 4 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="24" y="28" textAnchor="middle" fontFamily="inherit" fontWeight="700" fontSize="11" fill="currentColor">10</text>
          </svg>
        </button>
        <button type="button" className={styles.videoPlayBtn} onClick={togglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4.5" width="4" height="15" rx="1" />
              <rect x="14" y="4.5" width="4" height="15" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
        <button type="button" className={styles.videoSkipBtn} onClick={() => skip(10)} aria-label="Skip forward 10 seconds">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 10c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M38 16l-4-6-4 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="24" y="28" textAnchor="middle" fontFamily="inherit" fontWeight="700" fontSize="11" fill="currentColor">10</text>
          </svg>
        </button>
      </div>

      <div
        className={styles.videoBottomBar}
        style={
          mediaWidth != null
            ? { left: '50%', right: 'auto', width: `${mediaWidth}px`, transform: 'translateX(-50%)' }
            : undefined
        }
      >
        <span className={styles.videoTime}>{formatTime(currentTime)}</span>
        <div
          className={styles.videoProgress}
          onClick={handleProgressSeek}
          role="slider"
          aria-label="Seek video position"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          <div className={styles.videoProgressFill} style={{ width: `${progress * 100}%` }} />
          <div className={styles.videoProgressHandle} style={{ left: `${progress * 100}%` }} />
        </div>
        <span className={styles.videoTime}>{formatTime(duration)}</span>
        <button type="button" className={styles.videoSpeedBtn} onClick={cycleRate} aria-label={`Playback speed ${playbackRate}x`}>
          {playbackRate}x
        </button>
        <button type="button" className={styles.videoIconBtn} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L19 9.41 17.59 8 15 10.59 12.41 8 11 9.41 13.59 12 11 14.59 12.41 16 15 13.41 17.59 16 19 14.59 16.59 12z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.49 4.49 0 0 0 16.5 12zM14 3.23v2.06a7.01 7.01 0 0 1 0 13.42v2.06A9.01 9.01 0 0 0 21 12 9.01 9.01 0 0 0 14 3.23z" />
            </svg>
          )}
        </button>
        <button type="button" className={styles.videoIconBtn} onClick={toggleFullscreen} aria-label="Toggle fullscreen">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* Per-media-type glyph for the thumbnail strip. */
function ThumbIcon({ kind }: { kind: 'audio' | 'video' | 'pdf' | 'document' | 'youtube' }) {
  if (kind === 'youtube') {
    return <AiOutlineYoutube aria-hidden="true" />
  }
  if (kind === 'video') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m23 7-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    )
  }
  if (kind === 'audio') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }
  if (kind === 'pdf') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

/* Live inline viewer source for a pdf / document banner slide.
   PDFs stream through the same-origin `/api/resource-file` proxy the
   fullscreen modal uses (the storage bucket has no CORS headers); other
   document types render through the Microsoft Office web viewer. */
function docLiveSrc(url: string, kind: 'pdf' | 'document'): string {
  return kind === 'pdf'
    ? `/api/resource-file?url=${encodeURIComponent(url)}#view=FitH`
    : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
}

/* Expand-to-fullscreen affordance pinned to the banner's top-right. */
function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.bannerExpandBtn}
      aria-label="View fullscreen"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    </button>
  )
}

/* Full-page detail skeleton — mirrors the real layout. */
function ResourceDetailSkeleton() {
  return (
    <>
      <section className={styles.detailHead} aria-hidden="true">
        <div className={`${styles.bannerCard} ${styles.skeleton}`} />
        <div className={styles.thumbStrip}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.thumbBtn} ${styles.skeleton}`} />
          ))}
        </div>
        <div className={styles.dhTop}>
          <div className={styles.dhInfo}>
            <div className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: '82%', height: 22, marginBottom: 6 }} />
            <div className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: '62%', height: 22, marginBottom: 10 }} />
            <div className={styles.dhChipsRow}>
              <div className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: 130, height: 22, borderRadius: 14 }} />
              <div className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: 110, height: 22, borderRadius: 20 }} />
            </div>
          </div>
        </div>
      </section>
      <article className={styles.detailMain} aria-hidden="true">
        <div className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: 120, height: 18, marginBottom: 14, borderRadius: 4 }} />
        <div className={styles.detailBody}>
          {[100, 95, 88, 70].map((w, i) => (
            <div key={`lede-${i}`} className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: `${w}%`, height: 16, marginBottom: 10 }} />
          ))}
          <div style={{ height: 14 }} />
          {[100, 98, 92, 86, 72].map((w, i) => (
            <div key={`para-${i}`} className={`${styles.skelLine} ${styles.skeleton}`} style={{ width: `${w}%`, height: 14, marginBottom: 8 }} />
          ))}
        </div>
      </article>
    </>
  )
}

type Slide =
  | { kind: 'image'; key: string; url: string; name: string }
  | { kind: 'placeholder'; key: string }
  | { kind: 'audio' | 'video' | 'pdf' | 'document'; key: string; url: string; name: string }
  | { kind: 'youtube'; key: string; url: string; name: string }

export default function ResourceDetailLayout({ id }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()

  const { data, isLoading, isError } = useQuery<ResourceEnvelope<ResourceDetail>>({
    queryKey: ['resource-detail', id],
    queryFn: () => getResourceDetail({ id }),
    enabled: !!id,
  })

  const resource = data?.status === 'OK' ? data.data : undefined
  // undefined = loading, null = not available, object = loaded.
  const detail: ResourceDetail | null | undefined = isLoading
    ? undefined
    : isError || !resource
      ? null
      : resource

  const [slideIndex, setSlideIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [noAnim, setNoAnim] = useState(false)
  const [loopClone, setLoopClone] = useState<null | 'forward' | 'backward'>(null)
  // Fullscreen enlarge modal (images / video / pdf / doc / audio).
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  // The slide the modal was opened on (kept stable while open so the
  // modal's own navigation doesn't feed back into its start index), plus
  // the resume position captured from the inline player.
  const [fullscreenStartIndex, setFullscreenStartIndex] = useState(0)
  const [resumeTime, setResumeTime] = useState(0)
  const [pageActive, setPageActive] = useState(true)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!loopClone) setDisplayIndex(slideIndex)
  }, [slideIndex, loopClone])

  useEffect(() => {
    setSlideIndex(0)
  }, [id])

  useEffect(() => {
    const onVisibility = () => setPageActive(!document.hidden)
    const onBlur = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) setPageActive(false)
      }, 0)
    }
    const onFocus = () => setPageActive(true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // Open the enlarge modal from the current slide. Capture the inline
  // player's current position FIRST (so the modal resumes from there),
  // then open — the effect below pauses the inline players.
  function openFullscreen() {
    let t = 0
    detailRef.current
      ?.querySelectorAll<HTMLVideoElement | HTMLAudioElement>('video, audio')
      .forEach((m) => {
        if (!m.paused) t = m.currentTime
      })
    setResumeTime(t)
    setFullscreenStartIndex(slideIndex)
    setFullscreenOpen(true)
  }

  // Pause any inline banner video/audio when the fullscreen modal opens
  // so the enlarged player is the only thing playing (no double audio).
  useEffect(() => {
    if (!fullscreenOpen) return
    detailRef.current
      ?.querySelectorAll<HTMLVideoElement | HTMLAudioElement>('video, audio')
      .forEach((m) => {
        if (!m.paused) m.pause()
      })
  }, [fullscreenOpen])

  // Slides follow the backend's media order (sorted by sort_order).
  const allSlides = useMemo<Slide[]>(() => {
    if (!detail) return []
    const out: Slide[] = []
    const sorted = [...(detail.media ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )
    for (const m of sorted) {
      const url = resolveUrl(m.url)
      if (!url) continue
      const kind = coerceKind(m.media_type, url)
      const name = detail.title
      if (kind === 'image') out.push({ kind: 'image', key: `img-${m.id}`, url, name })
      else out.push({ kind, key: `media-${m.id}`, url, name })
    }
    if (out.length === 0) out.push({ kind: 'placeholder', key: 'placeholder' })
    return out
  }, [detail])

  // Fullscreen-eligible media (everything except the empty placeholder).
  // Real slides never mix with a placeholder, so a slide's index in
  // `allSlides` matches its index here 1:1.
  const fullscreenMedia = useMemo(
    () =>
      allSlides
        .filter((s): s is Exclude<Slide, { kind: 'placeholder' }> => s.kind !== 'placeholder')
        .map((s) => ({ url: s.url, type: s.kind })),
    [allSlides]
  )

  const dateLabel = formatDateLabel(detail?.published_at ?? detail?.created_at ?? null)

  const linkedBodyHtml = useMemo(
    () => sanitizeAndLinkify(detail?.body ?? null),
    [detail?.body]
  )

  function go(idx: number) {
    if (allSlides.length === 0 || loopClone) return
    const n = allSlides.length
    setSlideIndex(((idx % n) + n) % n)
  }

  function startLoop(dir: 'forward' | 'backward') {
    const n = allSlides.length
    if (n < 2 || loopClone) return
    if (dir === 'forward') {
      setLoopClone('forward')
      setDisplayIndex(n)
    } else {
      setLoopClone('backward')
      setNoAnim(true)
      setDisplayIndex(1)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setNoAnim(false)
          setDisplayIndex(0)
        })
      )
    }
  }

  function onTrackTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== 'transform' || e.target !== e.currentTarget) return
    const n = allSlides.length
    if (loopClone === 'forward') {
      setNoAnim(true)
      setLoopClone(null)
      setSlideIndex(0)
      setDisplayIndex(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)))
    } else if (loopClone === 'backward') {
      setNoAnim(true)
      setLoopClone(null)
      setSlideIndex(n - 1)
      setDisplayIndex(n - 1)
      requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)))
    }
  }

  function handleSwipeStart(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (loopClone) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, iframe, [role="slider"]')) return
    const startX = e.clientX
    const startY = e.clientY
    const onEnd = (ev: PointerEvent) => {
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (Math.abs(dx) <= 50 || Math.abs(dx) <= Math.abs(dy)) return
      if (loopClone) return
      const n = allSlides.length
      if (dx < 0) {
        if (slideIndex < n - 1) go(slideIndex + 1)
        else startLoop('forward')
      } else {
        if (slideIndex > 0) go(slideIndex - 1)
        else startLoop('backward')
      }
    }
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  const renderSlide = (
    s: (typeof allSlides)[number],
    key: string,
    isActive: boolean,
    labelIndex: number
  ) => {
    if (s.kind === 'image') {
      return (
        <div key={key} className={styles.sliderSlide}>
          <div className={styles.sliderBlur} style={{ backgroundImage: `url(${s.url})` }} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.sliderImage} src={s.url} alt={`${detail?.title ?? ''} – image ${labelIndex + 1}`} loading={labelIndex === 0 ? undefined : 'lazy'} draggable={false} />
        </div>
      )
    }
    if (s.kind === 'placeholder') {
      return (
        <div key={key} className={styles.sliderSlide}>
          <div className={styles.bannerPlaceholder} aria-hidden="true" />
        </div>
      )
    }
    if (s.kind === 'video') {
      return (
        <div key={key} className={styles.sliderSlide}>
          <VideoPlayer src={s.url} title={s.name} active={isActive && pageActive} />
        </div>
      )
    }
    if (s.kind === 'audio') {
      return (
        <div key={key} className={styles.sliderSlide}>
          <div className={styles.bannerMediaWrap}>
            <AudioPlayer src={s.url} active={isActive && pageActive} />
          </div>
        </div>
      )
    }
    if (s.kind === 'youtube') {
      return (
        <div key={key} className={styles.sliderSlide}>
          <ResourceVideoEmbed url={s.url} title={s.name} active={isActive && !fullscreenOpen && pageActive} />
        </div>
      )
    }
    return (
      <div key={key} className={styles.sliderSlide}>
        <iframe className={styles.bannerDocFrame} src={docLiveSrc(s.url, s.kind as 'pdf' | 'document')} title={s.name} />
        <div className={styles.docSwipeLayer} aria-hidden="true" />
      </div>
    )
  }

  const railRef = useRef<HTMLDivElement>(null)
  const railDrag = useRef({ x: 0, left: 0, active: false, moved: false })

  function handleRailDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return
    const el = railRef.current
    if (!el) return
    railDrag.current = { x: e.clientX, left: el.scrollLeft, active: true, moved: false }
  }

  function handleRailMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!railDrag.current.active) return
    const el = railRef.current
    if (!el) return
    const dx = e.clientX - railDrag.current.x
    if (Math.abs(dx) > 4) railDrag.current.moved = true
    el.scrollLeft = railDrag.current.left - dx
  }

  function handleRailUp() {
    railDrag.current.active = false
  }

  return (
    <div
      className={styles.resourcesDetailPage}
      data-theme={resolvedTheme}
    >
      <main className={styles.detail} ref={detailRef}>
        <div className={styles.wrap}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.back()}
            aria-label="Back to Resources"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
            </svg>
            Resource Details
          </button>

          {detail === undefined ? (
            <ResourceDetailSkeleton />
          ) : detail === null ? (
            <div className={styles.detailEmpty}>This resource is no longer available.</div>
          ) : (
            <>
              <section className={styles.detailHead}>
                <div className={styles.bannerCard}>
                  <div
                    className={`${styles.sliderTrack}${noAnim ? ` ${styles.sliderTrackNoAnim}` : ''}`}
                    style={{ transform: `translateX(-${displayIndex * 100}%)`, touchAction: 'pan-y' }}
                    onPointerDown={handleSwipeStart}
                    onTransitionEnd={onTrackTransitionEnd}
                  >
                    {loopClone === 'backward' &&
                      renderSlide(allSlides[allSlides.length - 1], 'loop-clone-back', false, allSlides.length - 1)}
                    {allSlides.map((s, i) => renderSlide(s, s.key, i === slideIndex, i))}
                    {loopClone === 'forward' &&
                      renderSlide(allSlides[0], 'loop-clone-fwd', false, 0)}
                  </div>
                  {/* Fullscreen enlarge — shown for every real slide
                      (images, video, audio, pdf, doc). Video keeps its own
                      native fullscreen control too; this is the extra
                      expand-to-modal view the user asked for. */}
                  {fullscreenMedia.length > 0 &&
                  allSlides[slideIndex] &&
                  allSlides[slideIndex].kind !== 'placeholder' ? (
                    <ExpandButton onClick={openFullscreen} />
                  ) : null}
                  {allSlides.length > 1 ? (
                    <div className={`${styles.sliderNav}${allSlides[slideIndex]?.kind === 'video' || allSlides[slideIndex]?.kind === 'youtube' ? ` ${styles.sliderNavRaised}` : ''}`}>
                      <div className={styles.sliderDots}>
                        {allSlides.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`${styles.sliderDot} ${i === slideIndex ? styles.sliderDotActive : ''}`}
                            aria-label={`Go to slide ${i + 1}`}
                            onClick={() => go(i)}
                          />
                        ))}
                      </div>
                      <button type="button" className={styles.sliderArrow} aria-label="Previous slide" onClick={() => go(slideIndex - 1)} disabled={slideIndex === 0}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      <button type="button" className={styles.sliderArrow} aria-label="Next slide" onClick={() => go(slideIndex + 1)} disabled={slideIndex === allSlides.length - 1}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  ) : null}
                </div>

                {allSlides.length > 1 ? (
                  <div
                    className={styles.thumbStrip}
                    role="tablist"
                    aria-label="Resource media"
                    ref={railRef}
                    onPointerDown={handleRailDown}
                    onPointerMove={handleRailMove}
                    onPointerUp={handleRailUp}
                    onPointerLeave={handleRailUp}
                  >
                    {allSlides.map((s, i) => {
                      if (s.kind === 'placeholder') return null
                      const isActive = i === slideIndex
                      return (
                        <button
                          key={s.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-label={`Show ${s.kind} ${i + 1} of ${allSlides.length}`}
                          className={`${styles.thumbBtn} ${isActive ? styles.thumbBtnActive : ''}`}
                          onClick={() => {
                            if (railDrag.current.moved) return
                            go(i)
                          }}
                        >
                          {s.kind === 'image' ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img className={styles.thumbImg} src={s.url} alt="" loading="lazy" draggable={false} />
                          ) : (
                            <span className={styles.thumbIcon} aria-hidden="true">
                              <ThumbIcon kind={s.kind} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <div className={styles.dhTop}>
                  <div className={styles.dhLogo}>YP</div>
                  <div className={styles.dhInfo}>
                    <h1>{detail.title}</h1>
                    <div className={styles.dhChipsRow}>
                      {detail.category?.category_name ? (
                        <span className={styles.catChip}>{detail.category.category_name}</span>
                      ) : null}
                      <span className={styles.metaChip}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3.5 2" />
                        </svg>
                        {dateLabel || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <article className={styles.detailMain} id="article">
                <h2 className={styles.detailMainHeading}>Description</h2>
                <div className={styles.detailBody} dangerouslySetInnerHTML={{ __html: linkedBodyHtml }} />
              </article>
            </>
          )}
        </div>
      </main>

      <FullScreenMediaModal
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        media={fullscreenMedia}
        initialIndex={fullscreenStartIndex}
        startTime={resumeTime}
        onIndexChange={setSlideIndex}
      />
    </div>
  )
}
