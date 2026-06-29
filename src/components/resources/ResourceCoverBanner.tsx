'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import styles from '@/moduleCss/resources.module.css'
import ResourceDefaultImage from '../../../public/images/Resources.webp'
import BlurredCoverImage from '../commonUI/BlurredCoverImage'
import ResourceAudioPlayer from './ResourceAudioPlayer'
import type { ResourceMedia, ResourceMediaType } from '@/types/resources'

// react-pdf (pdfjs) relies on browser-only APIs like DOMMatrix that don't exist
// during SSR, so load the viewer client-side only — never evaluate it on the server.
// The document viewer (@cyntler/react-doc-viewer) renders PDF/DOCX with
// browser-only renderers, so it is loaded client-side only.
const ResourceDocumentViewer = dynamic(() => import('./ResourceDocumentViewer'), {
  ssr: false,
  loading: () => <div className={styles.doc_viewer_loading}>Loading document…</div>,
})

// media-chrome registers custom elements on the client only — load the video
// player client-side to avoid evaluating web-component code during SSR.
const ResourceVideoPlayer = dynamic(() => import('./ResourceVideoPlayer'), {
  ssr: false,
})
import FullScreenMediaModal from '../commonUI/FullScreenMediaModal'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'

interface ResourceCoverBannerProps {
  media: ResourceMedia[]
  title: string
  date?: string | null
}

const resolveImageUrl = (url: string | null | undefined): string | null => {
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

// Normalized slide descriptor used for the unified media slider.
type Slide = {
  key: string
  type: ResourceMediaType
  url: string
}

// --- thumbnail icons (non-image media) ----------------------------------
const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="14" height="14" rx="2" />
    <path d="M16 10l6-3v10l-6-3" />
  </svg>
)
const AudioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)
const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
)
const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h6" />
  </svg>
)
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
)

const ThumbIcon = ({ type }: { type: ResourceMediaType }) => {
  switch (type) {
    case 'video':
      return <VideoIcon />
    case 'audio':
      return <AudioIcon />
    case 'pdf':
      return <PdfIcon />
    case 'document':
      return <DocIcon />
    default:
      return <FileIcon />
  }
}

const ExpandButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="View fullscreen"
    onClick={(e) => { e.stopPropagation(); onClick() }}
    style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      transition: 'background 0.2s',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.75)' }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)' }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  </button>
)

const ResourceCoverBanner = ({
  media,
  title,
  date,
}: ResourceCoverBannerProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pause any playing video/audio when the user navigates to a different slide.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.querySelectorAll<HTMLVideoElement | HTMLAudioElement>('video, audio').forEach((media) => {
      if (!media.paused) media.pause()
    })
  }, [currentSlide])

  // Build the unified slide list from the media items only (the category
  // banner_image_url is intentionally excluded), sorted by sort_order
  // ascending. Never mutate the source url.
  const slides: Slide[] = []

  const sortedMedia = [...media].sort((a, b) => a.sort_order - b.sort_order)
  for (const m of sortedMedia) {
    const url = resolveImageUrl(m.url)
    if (!url) continue
    slides.push({ key: m.id, type: m.media_type, url })
  }

  // First image (if any) is reused as the audio player's cover art.
  const coverImage = slides.find((s) => s.type === 'image')?.url ?? null

  const onApiChange = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return
    setApi(carouselApi)
    setCurrentSlide(carouselApi.selectedScrollSnap())
    carouselApi.on('select', () => {
      setCurrentSlide(carouselApi.selectedScrollSnap())
    })
  }, [])

  const renderSlide = (slide: Slide, index: number) => {
    switch (slide.type) {
      case 'image':
        return (
          <div className={styles.detail_cover_wrapper}>
            <BlurredCoverImage
              src={slide.url}
              alt={`${title || 'Resource'} - Image ${index + 1}`}
              priority={index === 0}
              unoptimized
              fallbackSrc={ResourceDefaultImage}
            />
          </div>
        )
      case 'video':
        return (
          <div className={styles.detail_cover_wrapper}>
            <ResourceVideoPlayer url={slide.url} title={title} />
          </div>
        )
      case 'audio':
        return (
          <div className={styles.detail_cover_wrapper}>
            <div className={styles.detail_slide_audio_panel}>
              <ResourceAudioPlayer
                url={slide.url}
                title={title}
                coverUrl={coverImage}
                date={date}
              />
            </div>
          </div>
        )
      case 'pdf':
      case 'document':
        return (
          <div className={styles.detail_cover_wrapper}>
            <ResourceDocumentViewer url={slide.url} title={title} />
          </div>
        )
      default:
        // unknown / empty media_type → guarded generic panel (no iframe)
        return (
          <div className={styles.detail_cover_wrapper}>
            <div className={styles.detail_slide_doc_panel}>
              <span className={styles.detail_slide_audio_disc} aria-hidden="true">
                <FileIcon />
              </span>
              <a
                href={slide.url}
                download
                className={styles.detail_slide_frame_link}
              >
                Download file
              </a>
            </div>
          </div>
        )
    }
  }

  // No media at all → default placeholder image.
  if (slides.length === 0) {
    return (
      <div
        className={styles.detail_cover_wrapper}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <Image
          src={ResourceDefaultImage}
          alt={title || 'Resource cover image'}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      </div>
    )
  }

  // All slides are fullscreen-eligible (images, videos, documents, audio, etc.).
  const fullscreenMedia = slides.map((s) => ({ url: s.url, type: s.type as string }))

  // Single slide → render it directly (no carousel chrome / thumbnails).
  if (slides.length === 1) {
    return (
      <div style={{ position: 'relative' }}>
        {renderSlide(slides[0], 0)}
        <ExpandButton onClick={() => setFullscreenOpen(true)} />
        <FullScreenMediaModal
          isOpen={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          media={fullscreenMedia}
          initialIndex={0}
        />
      </div>
    )
  }

  // Multiple slides → carousel + counter + thumbnail strip.
  // Arrows + fullscreen button are placed OUTSIDE the Carousel so they sit
  // above the carousel frame rather than being clipped inside it.
  return (
    <div ref={containerRef} className={styles.detail_cover_slider}>
      <div style={{ position: 'relative' }}>
        <Carousel
          opts={{ loop: true }}
          setApi={onApiChange}
          className={styles.detail_cover_carousel}
        >
          <CarouselContent className={styles.detail_cover_carousel_content}>
            {slides.map((slide, index) => (
              <CarouselItem key={slide.key} className={styles.detail_cover_slide}>
                {renderSlide(slide, index)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Counter */}
        <div className={styles.detail_cover_counter}>
          {currentSlide + 1} / {slides.length}
        </div>

        {/* Prev / Next arrow buttons (outside Carousel) */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={(e) => {
            e.stopPropagation()
            const prev = (currentSlide - 1 + slides.length) % slides.length
            api?.scrollTo(prev)
          }}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.7)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={(e) => {
            e.stopPropagation()
            const next = (currentSlide + 1) % slides.length
            api?.scrollTo(next)
          }}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.7)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        {/* Fullscreen expand button — all media types */}
        <ExpandButton onClick={() => setFullscreenOpen(true)} />
      </div>

      {/* Fullscreen media modal */}
      {fullscreenMedia.length > 0 && (
        <FullScreenMediaModal
          isOpen={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          media={fullscreenMedia}
          initialIndex={currentSlide}
        />
      )}

      <div className={styles.detail_cover_thumbnails}>
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            className={`${styles.detail_cover_thumb} ${index === currentSlide ? styles.detail_cover_thumb_active : ''}`}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          >
            {slide.type === 'image' ? (
              <Image
                src={slide.url}
                alt={`Thumbnail ${index + 1}`}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.srcset = ''
                  target.src = ResourceDefaultImage.src
                }}
              />
            ) : (
              <span className={styles.detail_cover_thumb_icon}>
                <ThumbIcon type={slide.type} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ResourceCoverBanner
