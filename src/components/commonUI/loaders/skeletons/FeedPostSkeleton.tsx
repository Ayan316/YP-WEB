import React from 'react';
import styles from '@/moduleCss/feeds.module.css';
import skeletonStyles from '@/moduleCss/FeedPostSkeleton.module.css';

interface FeedPostSkeletonProps {
  count?: number;
  showComments?: boolean;
}

const SkeletonLoader: React.FC<{ width?: string; height?: string; className?: string }> = ({
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

export const FeedPostSkeleton: React.FC<{ showComments?: boolean }> = ({ showComments = false }) => {
  return (
    <div key="feed-skeleton" className={styles.feed_post_items}>
      {/* Repost Label Skeleton */}
      <div className={skeletonStyles.repostLabelSkeleton}>
        <SkeletonLoader width="20px" height="20px" />
        <SkeletonLoader width="120px" height="14px" />
      </div>

      {/* Header Skeleton */}
      <div className={styles.feed_post_item_header}>
        <div className={styles.feed_post_item_header_left}>
          {/* Profile Image Skeleton */}
          <div className={skeletonStyles.profileImageSkeleton}>
            <SkeletonLoader width="50px" height="50px" />
          </div>

          {/* Name and Time Skeleton */}
          <div className={skeletonStyles.headerNameSkeleton}>
            <SkeletonLoader width="140px" height="18px" />
            <SkeletonLoader width="100px" height="12px" className={skeletonStyles.marginTopSmall} />
          </div>
        </div>
      </div>

      {/* Body - Caption Skeleton */}
      <div className={skeletonStyles.bodySkeleton}>
        <div className={skeletonStyles.captionLinesSkeleton}>
          <SkeletonLoader width="100%" height="14px" />
          <SkeletonLoader width="95%" height="14px" className={skeletonStyles.marginTopSmall} />
          <SkeletonLoader width="60%" height="14px" className={skeletonStyles.marginTopSmall} />
        </div>

        {/* Image Gallery Skeleton */}
        <div className={styles.feed_post_item_body_images}>
          <div className={skeletonStyles.imageSkeleton}>
            <SkeletonLoader width="100%" height="300px" />
          </div>
        </div>

        {/* Bottom Area - Reactions and Actions */}
        <div className={skeletonStyles.bottomAreaSkeleton}>
          {/* Left - Reactions Count */}
          <div className={skeletonStyles.reactionCountSkeleton}>
            <SkeletonLoader width="16px" height="16px" />
            <SkeletonLoader width="150px" height="14px" className={skeletonStyles.marginLeftSmall} />
          </div>

          {/* Right - Action Buttons */}
          <div className={skeletonStyles.actionButtonsSkeleton}>
            <div className={skeletonStyles.actionButtonSkeleton}>
              <SkeletonLoader width="20px" height="20px" />
              <SkeletonLoader width="40px" height="14px" className={skeletonStyles.marginLeftSmall} />
            </div>
            <div className={skeletonStyles.actionButtonSkeleton}>
              <SkeletonLoader width="20px" height="20px" />
              <SkeletonLoader width="70px" height="14px" className={skeletonStyles.marginLeftSmall} />
            </div>
            <div className={skeletonStyles.actionButtonSkeleton}>
              <SkeletonLoader width="20px" height="20px" />
              <SkeletonLoader width="60px" height="14px" className={skeletonStyles.marginLeftSmall} />
            </div>
          </div>
        </div>

        {/* Comments Section Skeleton */}
        {showComments && (
          <div className={skeletonStyles.commentsSectionSkeleton}>
            {/* Comment Input Area */}
            <div className={skeletonStyles.commentInputSkeleton}>
              <SkeletonLoader width="32px" height="32px" />
              <SkeletonLoader width="calc(100% - 40px)" height="36px" className={skeletonStyles.marginLeftSmall} />
            </div>

            {/* Comments Header */}
            <div className={skeletonStyles.commentsHeaderSkeleton}>
              <SkeletonLoader width="120px" height="14px" />
            </div>

            {/* Comment Items */}
            {[1, 2, 3].map((index) => (
              <div key={index} className={skeletonStyles.commentItemSkeleton}>
                <div className={skeletonStyles.commentProfileSkeleton}>
                  <SkeletonLoader width="32px" height="32px" />
                </div>
                <div className={skeletonStyles.commentContentSkeleton}>
                  <div className={skeletonStyles.commentAuthorSkeleton}>
                    <SkeletonLoader width="100px" height="14px" />
                    <SkeletonLoader width="80px" height="12px" className={skeletonStyles.marginTopSmall} />
                  </div>
                  <div className={skeletonStyles.commentTextSkeleton}>
                    <SkeletonLoader width="100%" height="12px" />
                    <SkeletonLoader width="95%" height="12px" className={skeletonStyles.marginTopSmall} />
                  </div>
                  <SkeletonLoader width="40px" height="12px" className={skeletonStyles.marginTopSmall} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const FeedPostsSkeletonLoader: React.FC<FeedPostSkeletonProps> = ({
  count = 3,
  showComments = false,
}) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <FeedPostSkeleton key={index} showComments={showComments} />
      ))}
    </div>
  );
};

export default FeedPostsSkeletonLoader;
