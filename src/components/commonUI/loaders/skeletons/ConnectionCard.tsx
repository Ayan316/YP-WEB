"use client";

import styles from "@/moduleCss/connection.module.css";
import { ChevronDown } from "lucide-react";
import styleSheet from "@/_assets/style/style.module.css";
import skeletonStyles from "@/moduleCss/FeedPostSkeleton.module.css";
import ProfileCardSmallSkeleton from "./ProfileCardSmallSkeleton";

const SkeletonLoader: React.FC<{
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}> = ({ width = "100%", height = "16px", className = "", circle = false }) => (
  <div
    className={`${skeletonStyles.skeletonBase} ${className}`}
    style={{
      width,
      height,
      borderRadius: circle ? "50%" : "8px",
    }}
  />
);

export default function ConnectionCardSkeleton() {
  return (
    <div className={styles.connectionlisting_connection_list_container}>
      <div className={styles.connectionlisting_connection_list}>
        <div
          className={`${styles.connectionlisting_connection_item}`} style={{ pointerEvents: 'none' }}
        >
          <div className={styles.connectionlisting_connection_item_main}>
            <div className={styles.connectionlisting_connection_item_logo}>
              <SkeletonLoader
                className={`w-full h-full object-cover ${styles.connection_avatar}`}
              />
            </div>

            <div className={styles.connectionlisting_connection_item_content}>
              <SkeletonLoader
                className={styles.connectionlisting_connection_item_name}
              />

              <SkeletonLoader
                className={`${styles.connectionlisting_connection_item_details} flex items-center gap-1`}
              />
            </div>

            <div className={styles.connectionlisting_connection_item_btns}>
              <SkeletonLoader
                className={styles.connectionlisting_apply_button_skeleton}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
