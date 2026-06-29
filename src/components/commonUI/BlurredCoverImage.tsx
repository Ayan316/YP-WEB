'use client'

import Image, { type StaticImageData } from 'next/image'

interface BlurredCoverImageProps {
  src: string | StaticImageData
  alt: string
  /** Forwarded to the foreground (contained) image. */
  priority?: boolean
  unoptimized?: boolean
  /**
   * If the image fails to load, swap to this fallback. Mirrors the
   * onError pattern used elsewhere in the codebase.
   */
  fallbackSrc?: string | StaticImageData
}

/**
 * Letterbox-style cover image: a blurred copy of the same image fills
 * the container behind a contained (un-cropped) version of it. The
 * pattern matches Apple Music / YouTube / Spotify cover art and lets
 * banners with arbitrary aspect ratios sit nicely inside a fixed-ratio
 * frame without being either stretched or hard-cropped.
 *
 * The component renders three absolutely-positioned layers and assumes
 * the parent has `position: relative` and `overflow: hidden`.
 */
const BlurredCoverImage = ({
  src,
  alt,
  priority,
  unoptimized,
  fallbackSrc,
}: BlurredCoverImageProps) => {
  const fallbackHref =
    typeof fallbackSrc === 'string' ? fallbackSrc : fallbackSrc?.src

  const handleError = fallbackHref
    ? (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget
        target.srcset = ''
        target.src = fallbackHref
      }
    : undefined

  return (
    <>
      {/* Blurred backdrop — same image, cropped to fill, heavily blurred */}
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        unoptimized={unoptimized}
        priority={priority}
        sizes="100vw"
        style={{
          objectFit: 'cover',
          filter: 'blur(28px) saturate(1.2)',
          transform: 'scale(1.15)',
          zIndex: 0,
        }}
      />
      {/* Subtle dark wash so the foreground image stands out a little */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.18)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {/* Foreground — the actual image, contained (no crop, no stretch) */}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        unoptimized={unoptimized}
        onError={handleError}
        sizes="(max-width: 768px) 100vw, 1200px"
        style={{ objectFit: 'contain', zIndex: 2 }}
      />
    </>
  )
}

export default BlurredCoverImage
