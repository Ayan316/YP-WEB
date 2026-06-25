'use client'

import React from 'react'
import styles from '@/moduleCss/messages.module.css'
import skeletonStyles from '@/moduleCss/ChatPanelSkeleton.module.css'

const SkeletonLoader: React.FC<{
  width?: string
  height?: string
  className?: string
  circle?: boolean
}> = ({ width = '100%', height = '16px', className = '', circle = false }) => (
  <div
    className={`${skeletonStyles.skeletonBase} ${className}`}
    style={{
      width,
      height,
      borderRadius: circle ? '50%' : '8px',
    }}
  />
)

const ConversationItemSkeleton: React.FC = () => (
  <div className={`${styles.conversationItem_card} ${skeletonStyles.conversationItemSkeleton}`}>

    {/* Avatar — same wrapper class as <Avatar className={styles.chatHeader_avatar} /> */}
    <div className={`${styles.chatHeader_avatar} ${skeletonStyles.avatarSkeleton}`}>
      <SkeletonLoader width="100%" height="100%" circle />
    </div>

    {/* Right column: name → preview message → date (stacked, matches real card) */}
    <div className='w-full'>
      <div className={styles.conversationItem_card_title_wrapper}>
        <SkeletonLoader width="130px" height="15px" />
      </div>

      <SkeletonLoader
        width="180px"
        height="12px"
        className={skeletonStyles.marginTopSmall}
      />

      <SkeletonLoader
        width="70px"
        height="11px"
        className={skeletonStyles.marginTopSmall}
      />
    </div>
  </div>
)

export const ConversationListSkeleton: React.FC<{ count?: number }> = ({
  count = 4,
}) => (
  <div className='space-y-3'>
    {Array.from({ length: count }).map((_, i) => (
      <ConversationItemSkeleton key={i} />
    ))}
  </div>
)

export default ConversationListSkeleton