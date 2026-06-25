import styles from "@/moduleCss/messages.module.css";
import styleSheet from "@/_assets/style/style.module.css";
import skeletonStyles from "@/moduleCss/FeedPostSkeleton.module.css";
import ConversationListSkeleton from "./ConversationListSkeleton";
import ChatPanelSkeleton from "./ChatPanelSkeleton";

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

const ConversationListSkeletonSidebar: React.FC = function () {
  return (
    <aside className="custom-col-35 full-width-small">
      <div className={styles.conversationList_wrapper}>
        <div className={styles.conversationList}>
          <div className={styles.scrollableContent}>
            {/* SEARCH PANEL */}
            <div className={styles.search_panel}>
              <div className="search-flex">
                <div className={styleSheet.search_panel_area}>
                  <SkeletonLoader className={styleSheet.search_form} />
                  {/* <div className="relative w-full">
                      <span className={styleSheet.search_icon}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={20}
                          height={20}
                          viewBox="0 0 22 22"
                          fill="none"
                        >
                          <path
                            d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442Z"
                            fill="#E3E3E3"
                          />
                        </svg>
                      </span>
                    </div> */}
                </div>
              </div>
            </div>

            {/* CONVERSATION LIST */}
            <div className={styles.conversationList_inner}>
              <div className="space-y-3">
                <ConversationListSkeleton count={3} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const MessageLayoutSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto px-4">
      <div
        className={`${styles.message_main_section_wrapper} mt-6 max-content-height`}
      >
        <div className={`${styles.message_main_section_title}`}>
          <h2 className={`${styles.message_main_section_title_text}`}>
            Messages
          </h2>
        </div>
        <div className="row gap-y-4">
          <ConversationListSkeletonSidebar />
          <ChatPanelSkeleton />
        </div>
      </div>
    </div>
  );
};

export default MessageLayoutSkeleton;
