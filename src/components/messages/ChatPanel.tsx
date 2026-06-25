
"use client";

import { useEffect } from "react";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessage";
import EmptyChatState from "./EmptyChat";
import styles from "../../moduleCss/messages.module.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectionUserProfile } from "@/services/profile.services";
import { fetchMessagesByUser } from "@/services/messages.services";
import ChatPanelSkeleton from "../commonUI/loaders/skeletons/ChatPanelSkeleton";

export type ChatUser = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  lastMessage?: string;
  lastMessageDate?: string;
};

export default function ChatPanel({
  activeUser,
}: {
  activeUser: ChatUser | null;
}) {
  const userId = activeUser?.id;

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    queryClient.invalidateQueries({
      queryKey: ["messages", userId],
    });
  }, [userId, queryClient]);

  // Profile Query
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["chat-user-profile", userId],
    queryFn: () => getConnectionUserProfile(userId!),
    enabled: !!userId,
  });

  // Messages Query
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
  } = useQuery({
    queryKey: ["messages", userId],
    queryFn: () =>
      fetchMessagesByUser({
        peer_id: userId!,
      }),
    enabled: !!userId,
  });

  if (!activeUser) return <EmptyChatState />;

  if (isProfileLoading || isMessagesLoading) {
    return (
      // <section className="custom-col-65 full-width-midium text-white">
        <ChatPanelSkeleton />
      // </section>
    );
  }

  if (isMessagesError) {
    return (
      <section className="custom-col-65 full-width-midium text-red-500">
        Failed to load messages.
      </section>
    );
  }

  const profile = profileData?.data;
  const connection_status = messagesData?.data?.connection_status;
  const messages = [...(messagesData?.data?.result || [])].sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const canMessage = connection_status !== false;

  console.log("Chat user profile---->(ChatPanel.tsx):", profile);

  return (
    <section className="custom-col-65 full-width-small">
      <div className={`${styles.conversationList_wrapper}`}>
        <div className={`${styles.conversationList_chat_panel}`}>
          <div className={`${styles.scrollableContent_chat_panel}`}>
            <ChatHeader
              user={{
                name: profile?.full_name,
                first_name: profile?.first_name,
                last_name: profile?.last_name,
                avatar: profile?.profile_image_url || null,
                location: profile?.location,
                id: profile?.id,
              }}
            />

            <ChatMessages messages={messages} chatUserId={activeUser.id} />

            {/* {connection_status === true && (
              <ChatInput chatUserId={activeUser.id} />
            )}

            {connection_status === false && (
              <div className="p-4 text-center text-gray-400 text-sm">
                You are no longer allowed to message this person.
              </div>
            )} */}

            {canMessage ? (
              <ChatInput chatUserId={activeUser.id} />
            ) : (
              <div className={`${styles.message_empty_bottom}`}>
                You're no longer connected to this person. You can't send or receive messages.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
