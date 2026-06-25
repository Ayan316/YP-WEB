'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, Music2 } from 'lucide-react'

interface FullScreenMediaModalProps {
  isOpen: boolean
  onClose: () => void
  media: Array<{ url: string; type?: string }>
  initialIndex?: number
  /** Resume position (seconds) for the media at `initialIndex` — lets the
   *  modal continue from where an inline player left off instead of 0:00. */
  startTime?: number
  /** Fired whenever the viewer navigates to a different slide inside the
   *  modal, so the caller can keep its own slider in sync (e.g. land on
   *  the same media after the modal closes). */
  onIndexChange?: (index: number) => void
}

/* ---- Inline audio player (mirrors ResourceAudioPlayer design) ---- */
const WAVE_BARS = 52
const BAR_HEIGHTS = Array.from({ length: WAVE_BARS }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.5) * 0.55 + Math.sin(i * 0.23 + 1.3) * 0.45)
  return 0.2 + (v % 1) * 0.8
})

const fmtTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const FSAudioPlayer = ({ url, startAt = 0 }: { url: string; startAt?: number }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const seekedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onMeta = () => {
      setDuration(a.duration || 0)
      // Resume once from the inline player's position when the widget mounts.
      if (startAt > 0 && !seekedRef.current) {
        a.currentTime = startAt
        setCurrent(startAt)
        seekedRef.current = true
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onMeta)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }

  const seekToClientX = (clientX: number) => {
    const a = audioRef.current
    const el = waveRef.current
    if (!a || !el || !duration) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1)
    a.currentTime = ratio * duration
    setCurrent(ratio * duration)
  }

  const progress = duration ? current / duration : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Centered Play/Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #5433ff, #23b8ff)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxShadow: '0 4px 24px rgba(84,51,255,0.4)',
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <Pause size={30} fill="currentColor" />
        ) : (
          <Play size={30} fill="currentColor" style={{ marginLeft: 3 }} />
        )}
      </button>

      {/* Waveform + times */}
      <div style={{ width: '100%' }}>
        <div
          ref={waveRef}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            height: 48,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onPointerDown={(e) => {
            draggingRef.current = true
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
            seekToClientX(e.clientX)
          }}
          onPointerMove={(e) => { if (draggingRef.current) seekToClientX(e.clientX) }}
          onPointerUp={(e) => {
            draggingRef.current = false
            try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
          }}
        >
          {BAR_HEIGHTS.map((h, i) => {
            const played = (i + 0.5) / WAVE_BARS <= progress
            return (
              <span
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 2,
                  height: `${Math.round(h * 100)}%`,
                  background: played
                    ? 'linear-gradient(180deg, #5433ff, #23b8ff)'
                    : 'rgba(255,255,255,0.18)',
                  transition: 'background 0.15s',
                }}
              />
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          <span>{fmtTime(current)}</span>
          <span>{duration ? fmtTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  )
}

const FullScreenMediaModal = ({
  isOpen,
  onClose,
  media,
  initialIndex = 0,
  startTime = 0,
  onIndexChange,
}: FullScreenMediaModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [mounted, setMounted] = useState(false)

  // Portal mount guard
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  // Report the active slide back to the caller so its own slider can stay
  // in sync (and land on the same media once the modal closes).
  useEffect(() => {
    if (isOpen) onIndexChange?.(currentIndex)
  }, [currentIndex, isOpen, onIndexChange])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const hasMultiple = media.length > 1

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }, [media.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }, [media.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        goNext()
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        goPrev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, hasMultiple, goNext, goPrev])

  if (!isOpen || !mounted || media.length === 0) return null

  const current = media[currentIndex]
  const mediaType = current.type || 'image'

  // Determine the file extension for PDF detection when type is generic
  const ext = current.url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || ''
  const isPdf = mediaType === 'pdf' || ext === 'pdf'
  const isDocument = mediaType === 'document' || ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)
  const isAudio = mediaType === 'audio'
  const isVideo = mediaType === 'video'

  // For PDFs/documents, use the same proxy the inline viewer uses
  const proxiedUrl = `/api/resource-file?url=${encodeURIComponent(current.url)}`

  const renderMedia = () => {
    if (isVideo) {
      return (
        <video
          key={current.url}
          src={current.url}
          controls
          onLoadedMetadata={(e) => {
            // Resume from the inline player's position, but only for the
            // slide the modal was opened on (not slides navigated to).
            if (startTime > 0 && currentIndex === initialIndex) {
              e.currentTarget.currentTime = startTime
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )
    }

    if (isPdf) {
      return (
        <iframe
          key={current.url}
          src={`${proxiedUrl}#view=FitH`}
          title="PDF document"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 8,
            background: '#fff',
          }}
        />
      )
    }

    if (isDocument) {
      return (
        <iframe
          key={current.url}
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(current.url)}`}
          title="Document viewer"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 8,
            background: '#fff',
          }}
        />
      )
    }

    if (isAudio) {
      return (
        <div
          key={current.url}
          style={{
            width: '80vw',
            maxWidth: 760,
            padding: '56px 48px',
            borderRadius: 24,
            background: 'linear-gradient(145deg, rgba(30,20,60,0.95), rgba(10,15,40,0.95))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 80px rgba(84,51,255,0.15), 0 0 40px rgba(35,184,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative gradient orbs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,51,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(35,184,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <FSAudioPlayer
            url={current.url}
            startAt={currentIndex === initialIndex ? startTime : 0}
          />
        </div>
      )
    }

    // Default: image — fills the large content box (object-fit: contain
    // upscales small images to the viewport while preserving aspect).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={current.url}
        src={current.url}
        alt={`Media ${currentIndex + 1}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        draggable={false}
      />
    )
  }

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="Close fullscreen viewer"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10001,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.3)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.15)'
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Media content — a large fixed box (≈90vw × 90vh) so images /
          video / docs fill the viewport via object-fit instead of
          rendering at their small intrinsic size. The audio card centres
          inside it at its own width. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          height: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {renderMedia()}
      </div>

      {/* Prev button */}
      {hasMultiple && (
        <button
          type="button"
          aria-label="Previous"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10001,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.15)'
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasMultiple && (
        <button
          type="button"
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10001,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.15)'
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Slide counter */}
      {hasMultiple && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 14px',
            borderRadius: 20,
            letterSpacing: '0.5px',
            userSelect: 'none',
          }}
        >
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  )

  return createPortal(modal, document.body)
}

export default FullScreenMediaModal
