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

export default function ConnectionPageSkeleton() {
  return (
    <div
      className={`container mx-auto px-4 ${styles.connectionlisting_main_section_wrapper}`}
    >
      <div
        className="flex mt-6 max-content-height flex-wrap -mx-2"
        style={{ height: "100%" }}
      >
        {/* ============ SIDEBAR ============ */}
        <div className="col-lg-4 full-width-midium" style={{ height: "100%" }}>
          <aside className={styles.sidebar_main_section}>
            <ProfileCardSmallSkeleton />

            <div className={styles.side_connection_navigation}>
              <div className={styles.side_connection_info}>
                <div>
                  <h1 className={styles.side_connection_navigation_title}>
                    My Connections
                  </h1>
                </div>
                <div>
                  <h1 className={styles.side_connection_navigation_title}>0</h1>
                </div>
              </div>

              <div className={styles.connectionRow}>
                <div className={styles.connectionmain_label}>
                  <span>Requests</span>
                </div>
                <div>
                  <span className={styles.arrow}>
                    <ChevronDown height={15} width={15} />
                  </span>
                </div>
              </div>

              <div className={styles.connectionDropdown}>
                <div className={styles.connectionItem}>
                  <div className={styles.connectionlabel}>
                    <span>Received</span>
                  </div>
                  <div>
                    <span className={styles.badge}>0</span>
                  </div>
                </div>

                <div className={styles.connectionItem}>
                  <div className={styles.connectionlabel}>
                    <span>Sent</span>
                  </div>
                  <div>
                    <span className={styles.badge}>0</span>
                  </div>
                </div>

                <div className={styles.connectionItem}>
                  <div className={styles.connectionlabel}>
                    <span>Declined</span>
                  </div>
                  <div>
                    <span className={styles.badge}>0</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ============ MAIN CONTENT ============ */}
        <div className="col-lg-8 full-width-midium" style={{ height: "100%" }}>
          <main className={styles.connectionlisting_main_section}>
            <div className={styles.connectionlisting_main_section_header}>
              <div className="col-lg-6">
                <h1 className={styles.connectionlisting_main_section_title}>
                  Connections
                </h1>
              </div>

              <div className="col-lg-6 search-flex">
                <div className={styleSheet.search_panel_area}>
                  <form className={styleSheet.search_form}>
                    <span className={styleSheet.search_icon}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox="0 0 22 22"
                        fill="none"
                      >
                        <path
                          d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818Z"
                          fill="#E3E3E3"
                        />
                      </svg>
                    </span>

                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Search"
                        className={`${styleSheet.search_panel} pr-10`}
                      />
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className={styles.connectionlisting_connection_list_container}>
              <div className={styles.connectionlisting_connection_list}>
                <div
                  className={`${styles.connectionlisting_connection_item}`} style={{ pointerEvents: 'none' }}
                >
                  <div
                    className={styles.connectionlisting_connection_item_main}
                  >
                    <div
                      className={styles.connectionlisting_connection_item_logo}
                    >
                      <SkeletonLoader
                        className={`w-full h-full object-cover ${styles.connection_avatar}`}
                      />
                    </div>

                    <div
                      className={
                        styles.connectionlisting_connection_item_content
                      }
                    >
                      <SkeletonLoader
                        className={
                          styles.connectionlisting_connection_item_name
                        }
                      />

                      <SkeletonLoader
                        className={`${styles.connectionlisting_connection_item_details} flex items-center gap-1`}
                      />
                    </div>

                    <div
                      className={styles.connectionlisting_connection_item_btns}
                    >
                      <SkeletonLoader
                        className={styles.connectionlisting_apply_button_skeleton}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.connectionlisting_connection_list}>
                <div
                  className={`${styles.connectionlisting_connection_item}`} style={{ pointerEvents: 'none' }}
                >
                  <div
                    className={styles.connectionlisting_connection_item_main}
                  >
                    <div
                      className={styles.connectionlisting_connection_item_logo}
                    >
                      <SkeletonLoader
                        className={`w-full h-full object-cover ${styles.connection_avatar}`}
                      />
                    </div>

                    <div
                      className={
                        styles.connectionlisting_connection_item_content
                      }
                    >
                      <SkeletonLoader
                        className={
                          styles.connectionlisting_connection_item_name
                        }
                      />

                      <SkeletonLoader
                        className={`${styles.connectionlisting_connection_item_details} flex items-center gap-1`}
                      />
                    </div>

                    <div
                      className={styles.connectionlisting_connection_item_btns}
                    >
                      <SkeletonLoader
                        className={styles.connectionlisting_apply_button_skeleton}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}