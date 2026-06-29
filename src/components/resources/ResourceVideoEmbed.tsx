'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from '@/moduleCss/resourceDetail.module.css'

interface ResourceVideoEmbedProps {
  url: string
  title?: string
  active?: boolean
  // When true, renders a transparent swipe surface over the *centre* of the
  // player so the parent slider can be swiped to change slides. The top and
  // bottom bands are left uncovered so YouTube's own controls (title/settings
  // up top, scrubber + control bar at the bottom) stay fully clickable. Used
  // by the resource slider; the fullscreen modal leaves it off (no swipe).
  swipeable?: boolean
  // Controls YouTube's `rel` flag. false (default) → `rel=0`, which keeps the
  // end-screen / "more videos" suggestions to the same channel only (the
  // closest YouTube allows to "no suggestions") — used by the inline player.
  // true → `rel=1`, the full related-video suggestions — used by the expander
  // (fullscreen modal).
  related?: boolean
}

function youTubeId(url: string): string | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') {
    id = u.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    id = u.searchParams.get('v')
    if (!id) {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2 && ['shorts', 'embed', 'v', 'live'].includes(parts[0])) {
        id = parts[1]
      }
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  const w = window as any
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT)
  return new Promise(resolve => {
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(w.YT)
    }
    const interval = setInterval(() => {
      if (w.YT && w.YT.Player) {
        clearInterval(interval)
        resolve(w.YT)
      }
    }, 100)
  })
}

const ResourceVideoEmbed = ({ url, title, active = true, swipeable = false, related = false }: ResourceVideoEmbedProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const tapStart = useRef<{ x: number; y: number } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [thumbHiResFailed, setThumbHiResFailed] = useState(false)
  const id = youTubeId(url)

  // Pause the video when this embed becomes inactive (user swiped to another
  // slide / left the page). Uses the YouTube IFrame postMessage API — the
  // `enablejsapi=1` flag on the src lets the player accept this command.
  useEffect(() => {
    if (!active && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        '*'
      )
    }
  }, [active])

  // In the slider context the centre swipe surface covers YouTube's own
  // play/pause button, so we drive play/pause ourselves via the IFrame API and
  // a tap on that surface (a horizontal drag is handled by the parent slider).
  // Only needed when `swipeable`; the fullscreen modal uses native controls.
  useEffect(() => {
    if (!swipeable || !playing || !id) return
    let cancelled = false
    let player: any = null
    loadYouTubeIframeApi().then((YT: any) => {
      if (cancelled || !iframeRef.current || !YT) return
      player = new YT.Player(iframeRef.current)
      playerRef.current = player
    })
    return () => {
      cancelled = true
      try {
        player?.destroy?.()
      } catch {}
      playerRef.current = null
    }
  }, [swipeable, playing, id])

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (p.getPlayerState?.() === 1) p.pauseVideo?.()
    else p.playVideo?.()
  }

  const onLayerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    tapStart.current = { x: e.clientX, y: e.clientY }
  }

  const onLayerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = tapStart.current
    tapStart.current = null
    if (!start) return
    // A small movement = tap → toggle play/pause. A larger horizontal move is a
    // swipe and is left for the parent slider (this handler does nothing then).
    if (Math.abs(e.clientX - start.x) < 8 && Math.abs(e.clientY - start.y) < 8) {
      togglePlay()
    }
  }

  if (!id) {
    return (
      <div className={styles.ytEmbedFallback}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open video ↗
        </a>
      </div>
    )
  }

  if (!playing) {
    const thumb = `https://img.youtube.com/vi/${id}/${thumbHiResFailed ? 'mqdefault' : 'maxresdefault'}.jpg`
    return (
      <div className={styles.ytEmbed}>
        <div
          className={styles.ytThumbBlur}
          style={{ backgroundImage: `url(${thumb})` }}
          aria-hidden="true"
        />
        <Image
          className={styles.ytThumbImg}
          src={thumb}
          alt={title || 'YouTube video'}
          fill
          unoptimized
          draggable={false}
          onError={() => {
            if (!thumbHiResFailed) setThumbHiResFailed(true)
          }}
        />
        <button
          type="button"
          className={styles.ytPlayBtn}
          aria-label="Play video"
          onClick={() => setPlaying(true)}
        >
          <svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
            <path
              d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
              fill="#f00"
            />
            <path d="M45 24 27 14v20z" fill="#fff" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.ytEmbed}>
      <iframe
        ref={iframeRef}
        className={styles.ytEmbedFrame}
        src={`https://www.youtube.com/embed/${id}?rel=${related ? 1 : 0}&autoplay=1&enablejsapi=1`}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Centre-only surface. A tap toggles play/pause (the layer covers
          YouTube's own centre button); a horizontal drag bubbles to the parent
          slider to change slides. It's a plain <div> (not an iframe), so the
          slider's pointerdown handler picks up the gesture instead of bailing.
          The top/bottom bands stay uncovered so the native scrubber + control
          row remain clickable. */}
      {swipeable && (
        <div
          className={styles.ytSwipeLayer}
          onPointerDown={onLayerDown}
          onPointerUp={onLayerUp}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default ResourceVideoEmbed
