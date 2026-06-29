import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/services/notifications.services";
import { useHasSession } from "@/app/hooks/useHasSession";

export const useHasUnseenNotifications = () => {
  const { data: hasSession } = useHasSession();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notificationsCount"],
    queryFn: () => fetchNotifications({ page: 1, limit: 1 }),
    enabled: hasSession === true,
    staleTime: 30000,
    select: (response) => response?.data?.unread_count ?? 0,
  });

  return { hasUnseen: unreadCount > 0, unreadCount };
};
