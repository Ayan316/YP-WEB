"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import MessageLayout from "@/components/messages/MessageLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatPanel from "@/components/messages/ChatPanel";
import { fetchAllMessages } from "@/services/messages.services";
import { useQueryClient } from "@tanstack/react-query";

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
  unseen_count?: string;
};

export default function MessagesClient() {
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedUserId = searchParams.get("user");

  /* ---------------- FETCH CONVERSATIONS ---------------- */
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchAllMessages,
    select: (response) => {
      return response.data.result
        .filter((chat: any) => chat.users)
        .map(
          (chat: any): ChatUser => ({
            id: chat.users.id,
            name: chat.users.full_name,
            first_name: chat.users.first_name,
            last_name: chat.users.last_name,
            avatar: chat.users.profile_image_url,
            lastMessage: chat.last_message?.text,
            lastMessageDate: chat.last_message?.created_at,
            hasMedia: chat.last_message?.media_urls,
            lastMessageSenderId: chat.last_message?.sender_id,
            unseen_count: chat.last_message?.unseen_count,
          }),
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.lastMessageDate || 0).getTime() -
            new Date(a.lastMessageDate || 0).getTime(),
        );
    },
  });

  const conversations = data || [];

  /* ---------------- AUTO OPEN FIRST CHAT ---------------- */
  useEffect(() => {
    if (isLoading) return;

    if (!selectedUserId && conversations.length > 0) {
      router.replace(`/messages?user=${conversations[0].id}`);
    }
  }, [selectedUserId, conversations, isLoading, router]);

  /* ---------------- RESET UNSEEN COUNT ON OPEN ---------------- */
  useEffect(() => {
    if (!selectedUserId) return;

    queryClient.setQueryData(["conversations"], (oldData: any) => {
      if (!oldData?.data?.result) return oldData;

      const updatedResult = oldData.data.result.map((chat: any) => {
        if (chat.users?.id === selectedUserId) {
          return {
            ...chat,
            last_message: {
              ...chat.last_message,
              unseen_count: "0",
            },
          };
        }
        return chat;
      });

      return {
        ...oldData,
        data: {
          ...oldData.data,
          result: updatedResult,
        },
      };
    });
  }, [selectedUserId, queryClient]);

  /* ---------------- DERIVE ACTIVE USER ---------------- */
  const activeUser = useMemo(() => {
    if (!selectedUserId) return null;
    return (
      conversations.find((c: any) => c.id === selectedUserId) || {
        id: selectedUserId,
        name: "",
      }
    );
  }, [selectedUserId, conversations]);

  const handleSelectUser = (user: ChatUser) => {
    router.replace(`/messages?user=${user.id}`);

    queryClient.setQueryData(["conversations"], (oldData: any) => {
      if (!oldData?.data?.result) return oldData;

      const updatedResult = oldData.data.result.map((chat: any) => {
        if (chat.users?.id === user.id) {
          return {
            ...chat,
            last_message: {
              ...chat.last_message,
              unseen_count: "0",
            },
          };
        }
        return chat;
      });

      return {
        ...oldData,
        data: {
          ...oldData.data,
          result: updatedResult,
        },
      };
    });
  };

  return (
    <MessageLayout>
      <ConversationList
        data={conversations}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        isLoading={isLoading}
      />
      <ChatPanel activeUser={activeUser} />
    </MessageLayout>
  );
}
