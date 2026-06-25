import React from 'react'
import companystyles from '@/moduleCss/comapnyDetails.module.css'
import skeletonStyles from '@/moduleCss/CompanyDetailsSkeleton.module.css'

interface SkeletonLoaderProps {
  width?: string
  height?: string
  className?: string
  borderRadius?: string
}

/**
 * Base Skeleton Loader Component
 * SSR-safe for Next.js
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '16px',
  className = '',
  borderRadius = '8px',
}) => {
  const props: any = {
    className: `${skeletonStyles.skeletonBase} ${className}`,
    suppressHydrationWarning: true,
  }

  if (width || height || borderRadius) {
    props.style = {
      width: width || 'auto',
      height: height || 'auto',
      borderRadius: borderRadius || '8px',
    }
  }

  return <div {...props} />
}

/**
 * CompanyCoverImageSkeleton Component
 * Shows cover image area with back button and title
 */
export const CompanyCoverImageSkeleton: React.FC = () => {
  return (
    <>
      <section className={companystyles.companyCoverImage_area_main_section} suppressHydrationWarning>
        <div className={companystyles.pageHeader}>
          <div className={companystyles.top_area}>
            <button 
              className='backbtn-page cursor-pointer' 
              disabled 
              suppressHydrationWarning
            >
              <span>
                <div className={skeletonStyles.backButtonIcon}>
                  <SkeletonLoader width='20px' height='20px' borderRadius='4px' />
                </div>
              </span>
              <h1 className={companystyles.pageTitle}>
                <SkeletonLoader width='200px' height='24px' />
              </h1>
            </button>
          </div>
        </div>

        {/* Cover Image Skeleton */}
        <div className={companystyles.companyCoverImage_area}>
          <SkeletonLoader 
            width='100%' 
            height='350px' 
            borderRadius='16px' 
            className={skeletonStyles.coverImageSkeleton}
          />
        </div>
      </section>
    </>
  )
}

export default CompanyCoverImageSkeleton
