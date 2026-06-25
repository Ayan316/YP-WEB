import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { receiveConnectionRequests } from "@/services/connections.services";
import { useHasSession } from "@/app/hooks/useHasSession";

const STORAGE_KEY = "connectionsSeenCount";

const getSeenCount = (): number => {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
};

export const useHasPendingConnections = (isOnPage: boolean) => {
  const { data: hasSession } = useHasSession();
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["pendingConnections"],
    enabled: hasSession === true,
    queryFn: async () => {
      const res = await receiveConnectionRequests({ page: 1, limit: 1 });
      // The service returns the action-wrapped body { status: "OK", data:
      // <backendBody> } and backend returns { status, data: { total_count,
      // result } }, so total_count is at res.data.data.total_count (with a
      // res.data.total_count fallback for a flatter backend shape).
      const count =
        res?.data?.data?.total_count ??
        res?.data?.total_count ??
        0;
      return Number(count);
    },
    staleTime: 0,
    retry: false,
  });

  const [seenCount, setSeenCount] = useState<number>(getSeenCount);

  useEffect(() => {
    if (isOnPage && totalCount > 0) {
      localStorage.setItem(STORAGE_KEY, String(totalCount));
      setSeenCount(totalCount);
    }
  }, [isOnPage, totalCount]);

  return { hasPending: totalCount > seenCount };
};
