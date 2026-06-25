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
 * Job Card Skeleton Component
 * Individual job card loader
 */
const JobCardSkeleton: React.FC = () => {
  return (
    <div className={skeletonStyles.jobCardSkeleton}>
      {/* Job Card Image */}
      <div className={skeletonStyles.jobCardImageContainer}>
        <SkeletonLoader 
          width='100%' 
          height='150px' 
          borderRadius='12px 12px 0 0'
          className={skeletonStyles.jobCardImage}
        />
      </div>

      {/* Job Card Content */}
      <div className={skeletonStyles.jobCardContent}>
        {/* Job Title */}
        <SkeletonLoader 
          width='100%' 
          height='18px'
          className={skeletonStyles.contentLine}
        />

        {/* Company Name */}
        <SkeletonLoader 
          width='80%' 
          height='16px'
          className={skeletonStyles.contentLine}
        />

        {/* Location */}
        <SkeletonLoader 
          width='90%' 
          height='14px'
          className={skeletonStyles.contentLine}
        />

        {/* Buttons Container */}
        <div className={skeletonStyles.buttonsContainer}>
          <SkeletonLoader 
            width='48%' 
            height='32px' 
            borderRadius='20px'
          />
          <SkeletonLoader 
            width='48%' 
            height='32px' 
            borderRadius='20px'
          />
        </div>
      </div>
    </div>
  )
}

/**
 * BottomTabSectionSkeleton Component
 * Shows section title and grid of job cards
 */
export const BottomTabSectionSkeleton: React.FC = () => {
  return (
    <>
      <div 
        className={companystyles.company_bottom_tab_section}
        suppressHydrationWarning
        style={{padding: '10px'}}
      >
        {/* Section Title */}
        <h4 className={companystyles.company_bottom_tab_name}>
          <SkeletonLoader 
            width='200px' 
            height='24px'
            className={skeletonStyles.sectionTitleSkeleton}
          />
        </h4>

        {/* Job Cards Grid */}
        <div className={companystyles.jobListing_more_jobs_cards}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className={skeletonStyles.jobCardWrapper}
            >
              <JobCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default BottomTabSectionSkeleton
