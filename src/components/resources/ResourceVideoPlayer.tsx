'use client'

// Custom video player built on media-chrome (Mux) — framework-agnostic web
// components with a React 19-safe wrapper. Composed to match the mobile app:
// a centered −10s / play / +10s overlay plus an auto-hiding bottom control bar
// (current time · seek · remaining time · speed · mute · fullscreen).
import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
  MediaPlaybackRateButton,
  MediaFullscreenButton,
} from 'media-chrome/react'
import styles from '@/moduleCss/resources.module.css'

interface ResourceVideoPlayerProps {
  url: string
  title?: string
}

const ResourceVideoPlayer = ({ url, title }: ResourceVideoPlayerProps) => {
  return (
    <MediaController
      className={styles.video_player}
      aria-label={title ? `Video: ${title}` : 'Video'}
    >
      <video
        slot="media"
        src={url}
        preload="metadata"
        playsInline
        className={styles.video_el}
      />

      {/* Centered overlay: −10s / play / +10s */}
      <div slot="centered-chrome" className={styles.video_center_chrome}>
        <MediaSeekBackwardButton seekOffset={10} className={styles.video_center_btn} />
        <MediaPlayButton className={styles.video_center_play} />
        <MediaSeekForwardButton seekOffset={10} className={styles.video_center_btn} />
      </div>

      {/* Bottom control bar: current · seek · remaining · speed · mute · fullscreen */}
      <MediaControlBar className={styles.video_controlbar}>
        <MediaTimeDisplay />
        <MediaTimeRange className={styles.video_timerange} />
        <MediaTimeDisplay remaining />
        <MediaPlaybackRateButton />
        <MediaMuteButton />
        <MediaFullscreenButton />
      </MediaControlBar>
    </MediaController>
  )
}

export default ResourceVideoPlayer
