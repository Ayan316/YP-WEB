import React from 'react';
import jobstyles from '@/moduleCss/jobs.module.css';
import skeletonStyles from '@/moduleCss/ProfileCardSmallSkeleton.module.css';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '16px',
  className = ''
}) => (
  <div
    className={`${skeletonStyles.skeletonBase} ${className}`}
    style={{
      width,
      height,
      borderRadius: '8px',
    }}
  />
);

/**
 * ProfileCardSmallSkeleton Component
 * Skeleton loader matching ProfileCardsmall structure
 * Shows a loading state for user profile card
 */
export const ProfileCardSmallSkeleton: React.FC = () => {
  return (
    <div className={jobstyles.side_profile_section}>
      <div className='flex gap-4'>
        {/* Avatar Skeleton */}
        <div className={skeletonStyles.avatarSkeletonWrapper}>
          <div className={skeletonStyles.avatarSkeleton}>
            <SkeletonLoader width="100%" height="100%" />
          </div>
        </div>

        {/* Profile Info Skeleton */}
        <div className={skeletonStyles.profileInfoWrapper}>
          {/* Name Skeleton */}
          <div className={skeletonStyles.nameSkeletonWrapper}>
            <SkeletonLoader width="140px" height="18px" />
          </div>

          {/* Degree/Title Skeleton */}
          <div className={skeletonStyles.degreeSkeletonWrapper}>
            <SkeletonLoader width="160px" height="16px" />
          </div>

          {/* Location Skeleton */}
          <div className={skeletonStyles.locationSkeletonWrapper}>
            <div className={skeletonStyles.locationIconSkeleton}>
              <SkeletonLoader width="15px" height="15px" />
            </div>
            <SkeletonLoader width="120px" height="12px" className={skeletonStyles.marginLeftSmall} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Multiple ProfileCardSmallSkeleton Component
 * For loading multiple profile cards at once
 */
interface MultipleProfileSkeletonsProps {
  count?: number;
}

export const MultipleProfileCardSkeletons: React.FC<MultipleProfileSkeletonsProps> = ({
  count = 1,
}) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <ProfileCardSmallSkeleton key={index} />
      ))}
    </div>
  );
};

export default ProfileCardSmallSkeleton;
