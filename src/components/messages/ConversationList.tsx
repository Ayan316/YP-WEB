"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ConversationItem from "./ConversationItem";
import styles from "../../moduleCss/messages.module.css";
import styleSheet from "@/_assets/style/style.module.css";
import { X } from "lucide-react";
import ConversationListSkeleton from "../commonUI/loaders/skeletons/ConversationListSkeleton";
import { searchConnectedUsers } from "@/services/messages.services";
import useDebounce from "@/app/hooks/useDebounce";
import Image from "next/image";
import messageLogo from "../../_assets/icons/header_icons/message.svg";
import messageLogoLight from "../../_assets/icons/header_icons/message_outline_light.svg";
import { useTheme as useAppTheme } from "@/context/ThemeContext";

export type ChatUser = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  hasMedia?: any[];
  lastMessageSenderId?: string;
  currentUserId?: string;
  unseen_count?: string;
};

type Props = {
  data: ChatUser[];
  activeUser: ChatUser | null;
  onSelectUser: (user: ChatUser) => void;
  isLoading?: boolean;
  isError?: boolean;
};

export default function ConversationList({
  data,
  activeUser,
  onSelectUser,
  isLoading,
  isError,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const { resolvedTheme } = useAppTheme();
  const isLight = resolvedTheme === "light";
  const debouncedSearch = useDebounce(searchText, 400);

  const isSearching = debouncedSearch.trim().length > 0;

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["searchConnectedUsers", debouncedSearch],
    queryFn: () => searchConnectedUsers(debouncedSearch.trim()),
    enabled: isSearching,
    staleTime: 30000,
    retry: false,
    throwOnError: false,
    select: (response) => {
      const results = response?.data?.result ?? response?.result ?? [];
      if (!Array.isArray(results)) return [];
      return results
        .filter((u: any) => u.users?.id)
        .map((u: any): ChatUser => ({
          id: u.users.id,
          name: u.users.full_name || `${u.users.first_name ?? ""} ${u.users.last_name ?? ""}`.trim() || "Unknown",
          first_name: u.users.first_name,
          last_name: u.users.last_name,
          avatar: u.users.profile_image_url ?? undefined,
          lastMessage: u.last_message?.text,
          lastMessageDate: u.last_message?.created_at,
          hasMedia: u.last_message?.media_urls,
          lastMessageSenderId: u.last_message?.sender_id,
          unseen_count: u.last_message?.unseen_count,
        }));
    },
  });

  const displayData = isSearching ? (searchResults ?? []) : data ?? [];

  if (isError) {
    return (
      <aside className="custom-col-35 full-width-small p-3">
        Failed to load chats
      </aside>
    );
  }

  return (
    <aside className="custom-col-35 full-width-small">
      <div className={styles.conversationList_wrapper}>
        <div className={styles.conversationList}>
          <div className={styles.scrollableContent}>
            {/* SEARCH PANEL */}
            <div className={styles.search_panel}>
              <div className="search-flex">
                <div className={styleSheet.search_panel_area}>
                  <form
                    className={styleSheet.search_form}
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div className="relative w-full">
                      <span className={styleSheet.search_icon}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={20}
                          height={20}
                          viewBox="0 0 22 22"
                          fill="none"
                        >
                          <path
                            d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z"
                            fill="#E3E3E3"
                          />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className={`${styleSheet.search_panel} pr-10`}
                      />
                      {searchText && (
                        <button
                          type="button"
                          onClick={() => setSearchText("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* CONVERSATION LIST */}
            <div className={styles.conversationList_inner}>
              {isLoading || isSearchLoading ? (
                <ConversationListSkeleton count={3} />
              ) : (
                <div className="space-y-3">
                  {displayData.length ? (
                    displayData.map((user) => (
                      <ConversationItem
                        key={user.id}
                        user={user}
                        isActive={activeUser?.id === user.id}
                        onClick={() => {
                          onSelectUser(user);
                          setSearchText("");
                        }}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center" style={{ gap: '2px', padding: '20px 0' }}>
                      <Image src={isLight ? messageLogoLight : messageLogo} alt="No messages" width={24} height={24} style={{ opacity: 0.5, ...(isLight ? { filter: 'brightness(0) saturate(100%) invert(3%) sepia(15%) saturate(4962%) hue-rotate(186deg) brightness(97%) contrast(101%)' } : {}) }} />
                      <p style={{ color: isLight ? '#040F1F' : 'rgb(144 161 185)', margin: 0, fontSize: '14px' }}>
                        {isSearching ? "No users found" : "No conversations found"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
