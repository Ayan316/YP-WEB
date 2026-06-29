import React from 'react';
import styles from '@/moduleCss/messages.module.css';
import skeletonStyles from '@/moduleCss/ChatPanelSkeleton.module.css';

// ─── Base Skeleton Loader (same pattern as FeedPostSkeleton) ──────────────────

const SkeletonLoader: React.FC<{
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}> = ({ width = '100%', height = '16px', className = '', circle = false }) => (
  <div
    className={`${skeletonStyles.skeletonBase} ${className}`}
    style={{
      width,
      height,
      borderRadius: circle ? '50%' : '8px',
    }}
  />
);

// ─── ChatHeader Skeleton ──────────────────────────────────────────────────────

const ChatHeaderSkeleton: React.FC = () => (
  <div className={skeletonStyles.chatHeader}>
    {/* Avatar */}
    <SkeletonLoader width="44px" height="44px" circle />

    {/* Name + location */}
    <div className={skeletonStyles.chatHeaderInfo}>
      <SkeletonLoader width="160px" height="18px" />
      <SkeletonLoader
        width="100px"
        height="13px"
        className={skeletonStyles.marginTopSmall}
      />
    </div>

    {/* Action icons placeholder (right side) */}
    <div className={skeletonStyles.chatHeaderActions}>
      <SkeletonLoader width="28px" height="28px" circle />
      <SkeletonLoader width="28px" height="28px" circle />
    </div>
  </div>
);

// ─── Single Message Bubble Skeleton ──────────────────────────────────────────

const MessageBubbleSkeleton: React.FC<{ align: 'left' | 'right' }> = ({
  align,
}) => (
  <div
    className={`${skeletonStyles.messageBubbleRow} ${
      align === 'right'
        ? skeletonStyles.messageBubbleRowRight
        : skeletonStyles.messageBubbleRowLeft
    }`}
  >
    {align === 'left' && (
      <SkeletonLoader
        width="32px"
        height="32px"
        circle
        className={skeletonStyles.bubbleAvatar}
      />
    )}
    <div className={skeletonStyles.bubbleLines}>
      <SkeletonLoader width="220px" height="36px" />
      <SkeletonLoader
        width="140px"
        height="36px"
        className={skeletonStyles.marginTopSmall}
      />
    </div>
  </div>
);

// ─── ChatMessages Skeleton ────────────────────────────────────────────────────

const ChatMessagesSkeleton: React.FC = () => (
  <div className={skeletonStyles.chatMessages}>
    {/* Date divider */}
    <div className={skeletonStyles.dateDivider}>
      <SkeletonLoader width="80px" height="12px" />
    </div>

    <MessageBubbleSkeleton align="left" />
    <MessageBubbleSkeleton align="right" />
    <MessageBubbleSkeleton align="left" />
    <MessageBubbleSkeleton align="right" />
    <MessageBubbleSkeleton align="right" />
    <MessageBubbleSkeleton align="left" />
    <MessageBubbleSkeleton align="right" />
  </div>
);

// ─── ChatInput Skeleton ───────────────────────────────────────────────────────

const ChatInputSkeleton: React.FC = () => (
  <div className={skeletonStyles.chatInput}>
    <SkeletonLoader width="36px" height="36px" circle />
    <SkeletonLoader width="100%" height="44px" className={skeletonStyles.inputBar} />
    <SkeletonLoader width="36px" height="36px" circle />
  </div>
);

// ─── Full ChatPanel Skeleton ──────────────────────────────────────────────────

export const ChatPanelSkeleton: React.FC = () => (
  <section className="custom-col-65 full-width-small">
    <div className={`${styles.conversationList_wrapper}`}>
      <div className={`${styles.conversationList_chat_panel}`}>
        <div className={`${styles.scrollableContent_chat_panel}`}>
          <ChatHeaderSkeleton />
          <ChatMessagesSkeleton />
          <ChatInputSkeleton />
        </div>
      </div>
    </div>
  </section>
);

export default ChatPanelSkeleton;