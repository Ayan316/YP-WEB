import { useQuery } from "@tanstack/react-query";
import { fetchAllMessages } from "@/services/messages.services";
import { useHasSession } from "@/app/hooks/useHasSession";

export const useHasUnseenMessages = () => {
  const { data: hasSession } = useHasSession();
  const { data } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchAllMessages,
    enabled: hasSession === true,
    staleTime: 30000,
    select: (response) => {
      const result = response?.data?.result || [];
      return result.some(
        (chat: any) =>
          chat.last_message?.unseen_count &&
          chat.last_message.unseen_count !== "0",
      );
    },
  });

  return data ?? false;
};