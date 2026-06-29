'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import styles from '@/moduleCss/events.module.css'
import EventDefaultImage from '../../../public/images/Event.webp'
import BlurredCoverImage from '../commonUI/BlurredCoverImage'
import FullScreenMediaModal from '../commonUI/FullScreenMediaModal'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'

interface GalleryImage {
  id: string
  image_url: string
  sort_order: number
}

interface EventDetailsCoverImageProps {
  banner_image_url: string | null
  sidebar_image_url: string | null
  gallery_images: GalleryImage[]
  title: string
}

const resolveImageUrl = (url: string | null): string | null => {
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

const ExpandButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="View fullscreen"
    onClick={(e) => { e.stopPropagation(); onClick() }}
    style={{
      position: 'absolute',
      bottom: 12,
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

const EventDetailsCoverImage = ({
  banner_image_url,
  sidebar_image_url,
  gallery_images,
  title,
}: EventDetailsCoverImageProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  // Build ordered list of all images: banner first, then gallery (sorted), then sidebar
  const allImages: string[] = []

  const bannerUrl = resolveImageUrl(banner_image_url)
  if (bannerUrl) allImages.push(bannerUrl)

  // const sortedGallery = [...gallery_images].sort((a, b) => a.sort_order - b.sort_order)
  // for (const img of sortedGallery) {
  //   const url = resolveImageUrl(img.image_url)
  //   if (url) allImages.push(url)
  // }

  // const sidebarUrl = resolveImageUrl(sidebar_image_url)
  // if (sidebarUrl) allImages.push(sidebarUrl)

  const onApiChange = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return
    setApi(carouselApi)
    setCurrentSlide(carouselApi.selectedScrollSnap())
    carouselApi.on('select', () => {
      setCurrentSlide(carouselApi.selectedScrollSnap())
    })
  }, [])

  // Fallback: single default image if no images at all
  if (allImages.length === 0) {
    return (
      <div
        className={styles.event_details_cover_wrapper}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <Image
          src={EventDefaultImage}
          alt={title || 'Event cover image'}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      </div>
    )
  }

  // Single image: no slider needed
  if (allImages.length === 1) {
    return (
      <div className={styles.event_details_cover_wrapper} style={{ position: 'relative' }}>
        <BlurredCoverImage
          src={allImages[0]}
          alt={title || 'Event cover image'}
          priority
          unoptimized
          fallbackSrc={EventDefaultImage}
        />
        <ExpandButton onClick={() => setFullscreenOpen(true)} />
        <FullScreenMediaModal
          isOpen={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          media={allImages.map((url) => ({ url, type: 'image' }))}
          initialIndex={0}
        />
      </div>
    )
  }

  return (
    <div className={styles.event_cover_slider}>
      {/* Main Carousel */}
      <Carousel
        opts={{ loop: true }}
        setApi={onApiChange}
        className={styles.event_cover_carousel}
      >
        <CarouselContent className={styles.event_cover_carousel_content}>
          {allImages.map((url, index) => (
            <CarouselItem key={index} className={styles.event_cover_slide}>
              <div className={styles.event_details_cover_wrapper}>
                <BlurredCoverImage
                  src={url}
                  alt={`${title || 'Event'} - Image ${index + 1}`}
                  priority={index === 0}
                  unoptimized
                  fallbackSrc={EventDefaultImage}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>



        {/* Slide Counter */}
        <div className={styles.event_cover_counter}>
          {currentSlide + 1} / {allImages.length}
        </div>

        {/* Prev / Next arrow buttons */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={(e) => {
            e.stopPropagation()
            const prev = (currentSlide - 1 + allImages.length) % allImages.length
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
            const next = (currentSlide + 1) % allImages.length
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
        {/* Fullscreen expand button */}
        <ExpandButton onClick={() => setFullscreenOpen(true)} />
      </Carousel>

      {/* Thumbnail Strip */}
      <div className={styles.event_cover_thumbnails}>
        {allImages.map((url, index) => (
          <button
            key={index}
            className={`${styles.event_cover_thumb} ${index === currentSlide ? styles.event_cover_thumb_active : ''}`}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to image ${index + 1}`}
          >
            <Image
              src={url}
              alt={`Thumbnail ${index + 1}`}
              fill
              unoptimized
              className={styles.event_details_cover_image}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                target.srcset = ''
                target.src = EventDefaultImage.src
              }}
            />
          </button>
        ))}
      </div>

      {/* Fullscreen media modal */}
      <FullScreenMediaModal
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        media={allImages.map((url) => ({ url, type: 'image' }))}
        initialIndex={currentSlide}
      />
    </div>
  )
}

export default EventDetailsCoverImage
