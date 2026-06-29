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
 * CompanyInfoSkeleton Component
 * Shows company logo, name, location, email, and follow button
 */
export const CompanyInfoSkeleton: React.FC = () => {
  return (
    <>
      <section 
        className={companystyles.companyInfo_area_main_section} 
        suppressHydrationWarning
      >
        <div className={companystyles.companyInfo_area_container}>
          {/* Company Info Wrapper */}
          <div className={companystyles.companyInfo_area_wrapper}>
            {/* Company Logo Skeleton */}
            <div className={companystyles.companyInfo_icon_area}>
              <SkeletonLoader 
                width='100px' 
                height='100px' 
                borderRadius='10px'
                className={skeletonStyles.logoSkeleton}
              />
            </div>

            {/* Company Info Content */}
            <div className={skeletonStyles.infoContent}>
              {/* Company Name Skeleton */}
              <h4 className={companystyles.company_title}>
                <SkeletonLoader width='220px' height='20px' />
              </h4>

              {/* Lower Content - Location and Email */}
              <div className={companystyles.companyInfo_lower_content}>
                {/* Location Section */}
                <div className={skeletonStyles.infoBlock}>
                  <span className={companystyles.companyInfo_content_icon}>
                    <span className={skeletonStyles.iconPlaceholder}>
                      <SkeletonLoader width='12px' height='14px' borderRadius='50%' />
                    </span>
                   
                  </span>
                  <div className={companystyles.companyInfo_lower_content_text}>
                    <SkeletonLoader width='160px' height='14px' />
                  </div>
                </div>

                {/* Email Section */}
                <div className={skeletonStyles.infoBlock}>
                  <span className={companystyles.companyInfo_content_icon}>
                    <span className={skeletonStyles.iconPlaceholder}>
                      <SkeletonLoader width='16px' height='16px' borderRadius='50%' />
                    </span>
                   
                  </span>
                  <div className={companystyles.companyInfo_lower_content_text}>
                    <SkeletonLoader width='200px' height='14px' />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Follow Button Skeleton */}
          <div className={companystyles.connect_button_wrapper}>
            <SkeletonLoader 
              width='120px' 
              height='36px' 
              borderRadius='80px'
              className={skeletonStyles.followButtonSkeleton}
            />
          </div>
        </div>
      </section>
    </>
  )
}

export default CompanyInfoSkeleton
