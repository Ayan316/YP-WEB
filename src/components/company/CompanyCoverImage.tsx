'use client'

import { useState } from 'react'
import companystyles from '@/moduleCss/comapnyDetails.module.css'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import PlaceholderImage from '../../../public/images/company.webp'
import BlurredCoverImage from '../commonUI/BlurredCoverImage'
import FullScreenMediaModal from '../commonUI/FullScreenMediaModal'

type Props = {
  companyDetails: any
}
const CompanyCoverImage = (companyDetails: Props) => {
  const router = useRouter()
  const [fsOpen, setFsOpen] = useState(false)

  const bannerUrl = companyDetails?.companyDetails?.banner_url
  const mediaForModal = bannerUrl
    ? [{ url: bannerUrl, type: 'image' as const }]
    : []

  return (
    <>
      <section className={companystyles.companyCoverImage_area_main_section}>
        <div className={companystyles.pageHeader}>
          <div className={companystyles.top_area}>
            <div className='flex items-center gap-2 '>
              <button className='backbtn-page cursor-pointer' onClick={() => router.back()} type='button'>
                <span>
                  <Image
                    src='/profile/backbtn_icon.svg'
                    alt='Back'
                    width={20}
                    height={20}
                  />
                </span>
              </button>
              <h1 className={companystyles.pageTitle}>Company Details</h1>
            </div>
          </div>
        </div>

        <div
          className={companystyles.companyCoverImage_area}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {bannerUrl ? (
            <BlurredCoverImage
              src={bannerUrl}
              alt={companyDetails?.companyDetails?.name || 'Company cover'}
              priority
              unoptimized
              fallbackSrc={PlaceholderImage}
            />
          ) : (
            <Image
              src={PlaceholderImage}
              alt={companyDetails?.companyDetails?.name || 'Company cover'}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
          {/* Fullscreen expand button */}
          {bannerUrl && (
            <button
              type="button"
              aria-label="View fullscreen"
              onClick={() => setFsOpen(true)}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 5,
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
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.7)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)' }}
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
      </section>
      <FullScreenMediaModal
        isOpen={fsOpen}
        onClose={() => setFsOpen(false)}
        media={mediaForModal}
      />
    </>
  )
}

export default CompanyCoverImage
