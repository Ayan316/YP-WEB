'use client'

import { useState } from 'react'
import styles from '@/moduleCss/jobDetails.module.css'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import PlaceholderImage from '../../../public/images/DefaultJobImage3.webp'
import BlurredCoverImage from '../commonUI/BlurredCoverImage'
import FullScreenMediaModal from '../commonUI/FullScreenMediaModal'

type Props = {
  jobDetails: any
}

const JobCoverImage = ({ jobDetails }: Props) => {
  const router = useRouter()
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const coverUrl = jobDetails?.jopost_image_url

  return (
    <section className={styles.jobDetails_cover_section}>
      <div className={styles.pageHeader}>
        <div className={styles.top_area}>
          <div className='flex items-center gap-2'>
            <button
              className='backbtn-page cursor-pointer'
              onClick={() => router.back()}
              type='button'
            >
              <span>
                <Image
                  src='/profile/backbtn_icon.svg'
                  alt='Back'
                  width={20}
                  height={20}
                />
              </span>
            </button>
            <h1 className={styles.pageTitle}>Job Details</h1>
          </div>
        </div>
      </div>

      <div
        className={styles.jobDetails_cover_image_wrapper}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {coverUrl ? (
          <BlurredCoverImage
            src={coverUrl}
            alt={jobDetails?.title || 'Job cover'}
            priority
            unoptimized
            fallbackSrc={PlaceholderImage}
          />
        ) : (
          <Image
            src={PlaceholderImage}
            alt={jobDetails?.title || 'Job cover'}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        )}

        {/* Fullscreen expand button */}
        {coverUrl && (
          <button
            type="button"
            aria-label="View fullscreen"
            onClick={() => setFullscreenOpen(true)}
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
        )}
      </div>

      {/* Fullscreen media modal */}
      {coverUrl && (
        <FullScreenMediaModal
          isOpen={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          media={[{ url: coverUrl, type: 'image' }]}
          initialIndex={0}
        />
      )}
    </section>
  )
}

export default JobCoverImage
