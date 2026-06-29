'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Music2 } from 'lucide-react'
import styles from '@/moduleCss/resources.module.css'

interface ResourceAudioPlayerProps {
  url: string
  title: string
  // Accepted for caller compatibility but intentionally unused — the page
  // already shows the resource title/date; the player carries an "Audio" label.
  coverUrl?: string | null
  date?: string | null
}

// Number of bars in the pseudo-waveform.
const WAVE_BARS = 52

// Deterministic bar heights (0.2..1). No Math.random — keeps SSR/markup stable
// and avoids hydration mismatches. A couple of sine waves give an organic look.
const BAR_HEIGHTS = Array.from({ length: WAVE_BARS }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.5) * 0.55 + Math.sin(i * 0.23 + 1.3) * 0.45)
  return 0.2 + (v % 1) * 0.8
})

const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

const ResourceAudioPlayer = ({ url, title }: ResourceAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onMeta = () => setDuration(a.duration || 0)
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

  // Click + drag to seek along the waveform. Pointer capture keeps move/up
  // firing on the element even when the cursor leaves it (no window listeners).
  const seekToClientX = (clientX: number) => {
    const a = audioRef.current
    const el = waveRef.current
    if (!a || !el || !duration) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1)
    a.currentTime = ratio * duration
    setCurrent(ratio * duration)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore — pointer may already be gone */
    }
    seekToClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekToClientX(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    let next = a.currentTime
    if (e.key === 'ArrowLeft') next -= 5
    else if (e.key === 'ArrowRight') next += 5
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = duration
    else return
    e.preventDefault()
    next = Math.min(Math.max(0, next), duration)
    a.currentTime = next
    setCurrent(next)
  }

  const progress = duration ? current / duration : 0

  return (
    <div className={styles.file_player} role="group" aria-label={`Audio: ${title}`}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Large circular play / pause on the left */}
      <button
        type="button"
        className={styles.file_play_round}
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <Pause size={30} fill="currentColor" />
        ) : (
          <Play size={30} fill="currentColor" style={{ marginLeft: 3 }} />
        )}
      </button>

      {/* Right column: label, waveform, times */}
      <div className={styles.file_main}>
        <div className={styles.file_label}>
          <Music2 size={16} />
          <span className={styles.file_label_text}>Audio</span>
        </div>

        <div
          ref={waveRef}
          className={styles.file_wave}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration) || 0}
          aria-valuenow={Math.floor(current)}
          aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {BAR_HEIGHTS.map((h, i) => {
            const played = (i + 0.5) / WAVE_BARS <= progress
            return (
              <span
                key={i}
                className={`${styles.file_wave_bar} ${played ? styles.file_wave_bar_played : ''}`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            )
          })}
        </div>

        <div className={styles.file_times}>
          <span className={styles.file_time}>{formatTime(current)}</span>
          <span className={styles.file_time}>{duration ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  )
}

export default ResourceAudioPlayer
