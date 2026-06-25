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

// Deterministic keyword-chip widths — never call Math.random() in a
// server-rendered path (the width would differ between SSR and the client's
// first render, causing a hydration mismatch).
const KEYWORD_WIDTHS = [72, 88, 64, 96, 80, 68]

/**
 * CompanyKeywordsSkeleton Component
 * Shows keywords section with tags and website link
 */
export const CompanyKeywordsSkeleton: React.FC = () => {
  return (
    <>
      <div className='row' suppressHydrationWarning>
        {/* Keywords Section */}
        <div className='col-lg-8'>
          <div className={companystyles.keywords_section_main}>
            {/* Keywords Title */}
            <h4 className={companystyles.company_title}>
              <SkeletonLoader 
                width='120px' 
                height='20px'
                className={skeletonStyles.titleSkeleton}
              />
            </h4>

            {/* Keywords Wrapper */}
            <div className={companystyles.keywords_section_wrapper}>
              <div className={companystyles.keywords_section_wrapper_inner}>
                {/* Keyword Skeletons */}
                {Array.from({ length: 6 }).map((_, index) => (
                  <div 
                    key={index} 
                    className={skeletonStyles.keywordItemSkeleton}
                  >
                    <SkeletonLoader
                      width={`${KEYWORD_WIDTHS[index % KEYWORD_WIDTHS.length]}px`}
                      height='32px'
                      borderRadius='20px'
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Website Section */}
        <div className='col-lg-4'>
          <div className={companystyles.website_section_main}>
            {/* Website Title */}
            <h4 className={companystyles.company_title}>
              <SkeletonLoader 
                width='100px' 
                height='20px'
                className={skeletonStyles.titleSkeleton}
              />
            </h4>

            {/* Website Link Skeleton */}
            <button
              className={companystyles.companyInfo_website}
              disabled
              suppressHydrationWarning
            >
              <SkeletonLoader 
                width='100%' 
                height='40px' 
                borderRadius='8px'
                className={skeletonStyles.websiteLinkSkeleton}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CompanyKeywordsSkeleton
