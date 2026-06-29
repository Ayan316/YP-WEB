'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from '@/moduleCss/resourceDetail.module.css'

interface ResourceVideoEmbedProps {
  url: string
  title?: string
  active?: boolean
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

const ResourceVideoEmbed = ({ url, title, active = true }: ResourceVideoEmbedProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const tapStart = useRef<{ x: number; y: number } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [thumbHiResFailed, setThumbHiResFailed] = useState(false)
  const id = youTubeId(url)

  useEffect(() => {
    if (!active && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        '*'
      )
    }
  }, [active])

  useEffect(() => {
    if (!playing || !id) return
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
  }, [playing, id])

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
        src={`https://www.youtube.com/embed/${id}?rel=0&autoplay=1&enablejsapi=1`}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div
        className={styles.ytSwipeLayer}
        onPointerDown={onLayerDown}
        onPointerUp={onLayerUp}
        aria-hidden="true"
      />
    </div>
  )
}

export default ResourceVideoEmbed
