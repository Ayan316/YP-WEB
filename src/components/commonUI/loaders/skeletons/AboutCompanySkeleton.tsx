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
 * AboutCompanySkeleton Component
 * Shows about section with title and description skeleton
 */
export const AboutCompanySkeleton: React.FC = () => {
  return (
    <>
      <div 
        className={companystyles.company_about_section}
        suppressHydrationWarning
      >
        {/* Section Title */}
        <h4 className={companystyles.company_title}>
          <SkeletonLoader 
            width='180px' 
            height='20px'
            className={skeletonStyles.titleSkeleton}
          />
        </h4>

        {/* Description Skeleton */}
        <div className={skeletonStyles.descriptionContainer}>
          <SkeletonLoader 
            width='100%' 
            height='20px'
            className={skeletonStyles.descriptionLine}
          />
          <SkeletonLoader 
            width='100%' 
            height='20px'
            className={skeletonStyles.descriptionLine}
          />
          <SkeletonLoader 
            width='95%' 
            height='20px'
            className={skeletonStyles.descriptionLine}
          />
          <SkeletonLoader 
            width='100%' 
            height='20px'
            className={skeletonStyles.descriptionLine}
          />
          <SkeletonLoader 
            width='85%' 
            height='20px'
            className={skeletonStyles.descriptionLine}
          />
        </div>
      </div>
    </>
  )
}

export default AboutCompanySkeleton
