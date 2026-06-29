"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Briefcase, Users, X, LoaderCircle, Trash2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// Import your styles
import styles from "@/moduleCss/jobs.module.css";
import styleSheet from "@/_assets/style/style.module.css";
import UserDefaultImg from "../../../public/profile/default_user_icon.png";
import DefaultNotification from "../../../public/images/notificationDefault.svg";

import { useUserProfile } from "@/app/hooks/useUserProfile";
import { timeAgo } from "@/helpers/dateFormatter";
import {
  fetchNotifications,
  setNotificationReadStatus,
  type ReadStatus,
} from "@/services/notifications.services";
import Avatar from "../commonUI/Avatar";
import ProfileCardsmall from "../commonUI/ProfileCardsmall";
import JobCardSkeleton from "../commonUI/loaders/skeletons/JobCardSkeleton";
import notificationStyles from "@/moduleCss/notifications.module.css";
import { clearNotification } from "@/services/notifications.services";
import { ensureValidToken } from "@/lib/tokenManager";
import ConfirmModal from "../commonUI/ConfirmModal";
import { useTheme } from "@/context/ThemeContext";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";

type TabType = "all" | "jobs" | "connections";

// Backend notification structure
interface BackendNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  notification_details?: {
    job_id?: string;
    user_id?: string;
    connection_id?: string;
    company_id?: string;
    requester_id?: string;
    conversation_id?: string;
    sender_id?: string;
    event_id?: string;
    booking_id?: string;
    screen?: string;
    type?: string;
  };
  sender: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string | null;
    profile_completion_status?: string;
    name?: string;
    description?: string;
    logo_url?: string;
  }>;
  type: string;
  sender_type: any;
  read_status?: "0" | "1";
}

// Frontend notification interface
interface Notification {
  id: string;
  type: "job" | "connection" | "system" | "admin" | "booking";
  title: string;
  message: string;
  avatar_url?: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  sender_type: "user" | "company";
  sender_name: string;
  sender_first_name?: string;
  sender_last_name?: string;
  details_type?: string;
}

const getSenderName = (notification: BackendNotification): string => {
  const sender = notification.sender?.[0];
  // Admin/system notifications (e.g. booking_confirmed) have no sender — we
  // render just the title without a sender prefix in the UI, so return empty.
  if (!sender) return "";
  // Admin-sent broadcasts (sender_type === "admin") only show the sender name
  // when they're a "New Job" post; for plain admin announcements we drop the
  // "YOUNG-PRO Admin" prefix so only the title/body are shown.
  if (notification.sender_type === "admin") {
    const detailsType = notification.notification_details?.type;
    if (detailsType !== "job_post") return "";
  }
  if (notification.sender_type === "company") {
    return sender.name || "A company";
  } else {
    return (
      sender.full_name ||
      (sender.first_name && sender.last_name
        ? `${sender.first_name} ${sender.last_name}`
        : sender.first_name || sender.last_name) ||
      ""
    );
  }
};

const transformNotification = (
  backendNotif: BackendNotification,
): Notification => {
  const firstSender = backendNotif.sender?.[0];
  const avatarUrl =
    firstSender?.profile_image_url || firstSender?.logo_url || undefined;
  const details = backendNotif.notification_details;

  let actionUrl: string | undefined;
  if (details?.type) {
    switch (details.type) {
      case "connection_request":
        actionUrl = "/connections?tab=received";
        break;
      case "connection_accepted":
        actionUrl = "/connections";
        break;
      case "new_message":
        if (details.conversation_id && details.sender_id) {
          actionUrl = `/messages/?user=${details.sender_id}`;
        }
        break;
      case "job_post":
        if (details.job_id) {
          actionUrl = `/jobs/${details.job_id}`;
        }
        break;
      case "booking_confirmed":
        if (details.booking_id) {
          actionUrl = `/booking/${encodeURIComponent(details.booking_id)}`;
        }
        break;
      default:
        actionUrl = undefined;
    }
  }

  return {
    id: backendNotif.id,
    type:
      details?.type === "booking_confirmed"
        ? "booking"
        : details?.type === "job_post"
          ? "job"
          : backendNotif.sender_type === "admin"
            ? "admin"
            : details?.type === "connection_request" ||
                details?.type === "connection_accepted"
              ? "connection"
              : "system",
    title: backendNotif.title,
    message: backendNotif.body,
    avatar_url: avatarUrl,
    created_at: backendNotif.created_at,
    is_read: backendNotif.read_status === "1",
    action_url: actionUrl,
    sender_type: backendNotif.sender_type,
    sender_name: getSenderName(backendNotif),
    sender_first_name: firstSender?.first_name,
    sender_last_name: firstSender?.last_name,
    details_type: details?.type,
  };
};

const Notifications = () => {
  const toTitleCase = (name?: string) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const { ensureAuthed, openGate, gateModal: authGateModal, isAuthenticated, isResolving } =
    useAuthGate();
  // Keep the profile sidebar while authenticated (or while the auth signal is
  // still resolving). When definitively anonymous, drop it and let the main
  // column span full width.
  const showSidebar = isAuthenticated || isResolving;
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  // Clear All confirmation modal state
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();
  const user = userProfile?.data;

  /* ---------------- FETCH NOTIFICATIONS ---------------- */
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ["notifications", { tab: activeTab, search: searchInput }],
    queryFn: async ({ pageParam = 1 }) => {
      await ensureValidToken();
      return fetchNotifications({
        page: pageParam,
        limit: 20,
        searchText: searchInput.length >= 2 ? searchInput : undefined,
      });
    },
    enabled: !!user && !userProfileLoading,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalCount = lastPage?.data?.total_count || 0;
      const totalPages = Math.ceil(totalCount / 20);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30000,
  });

  console.log("Notifications Data from notification page:", notificationsData);
  console.log("Notifications Data Actual:", notificationsData?.pages[0]?.data);
  console.log(
    "Notifications Data Count:",
    notificationsData?.pages[0]?.data?.count,
  );

  /* ---------------- TOGGLE READ / UNREAD MUTATION ---------------- */
  type NotificationsPage = {
    data?: {
      count?: number;
      total_count?: number;
      unread_count?: number;
      result?: BackendNotification[];
    };
  };
  type NotificationsInfiniteData = {
    pages: NotificationsPage[];
    pageParams: unknown[];
  };
  type CountQueryData = {
    data?: { unread_count?: number };
  };
  type Snapshot<T> = [readonly unknown[], T | undefined];

  const toggleReadMutation = useMutation({
    mutationFn: async ({
      id,
      readStatus,
    }: {
      id: string;
      readStatus: ReadStatus;
      previousReadStatus: ReadStatus;
    }) => {
      await ensureValidToken();
      return setNotificationReadStatus(id, readStatus);
    },
    onMutate: async ({ id, readStatus, previousReadStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notificationsCount"] });

      const previousListSnapshots = queryClient.getQueriesData<NotificationsInfiniteData>({
        queryKey: ["notifications"],
      }) as Snapshot<NotificationsInfiniteData>[];
      const previousCountSnapshots = queryClient.getQueriesData<CountQueryData>({
        queryKey: ["notificationsCount"],
      }) as Snapshot<CountQueryData>[];

      const delta =
        previousReadStatus === readStatus ? 0 : readStatus === "1" ? -1 : 1;

      queryClient.setQueriesData<NotificationsInfiniteData>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page, idx) => {
              if (!page?.data) return page;
              const updatedResult = (page.data.result || []).map((n) =>
                n.id === id ? { ...n, read_status: readStatus } : n,
              );
              const currentUnread = page.data.unread_count ?? 0;
              return {
                ...page,
                data: {
                  ...page.data,
                  result: updatedResult,
                  unread_count:
                    idx === 0
                      ? Math.max(0, currentUnread + delta)
                      : page.data.unread_count,
                },
              };
            }),
          };
        },
      );

      queryClient.setQueriesData<CountQueryData>(
        { queryKey: ["notificationsCount"] },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              unread_count: Math.max(
                0,
                (old.data.unread_count ?? 0) + delta,
              ),
            },
          };
        },
      );

      return { previousListSnapshots, previousCountSnapshots };
    },
    onError: (err, _vars, context) => {
      if (isUnauthenticatedError(err)) openGate("manage notifications");
      context?.previousListSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      context?.previousCountSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
    },
  });

  /* ---------------- DELETE NOTIFICATION MUTATION ---------------- */
  // Optimistically remove the notification from every cached list page and, if
  // it was unread, decrement the badge count query (["notificationsCount"]) so
  // the header badge updates immediately — same pattern as the read/unread
  // toggle above. onSettled re-syncs with the server (authoritative).
  const clearNotificationMutation = useMutation({
    mutationFn: async ({ id }: { id: string; wasUnread: boolean }) => {
      await ensureValidToken();
      return clearNotification(id);
    },
    onMutate: async ({ id, wasUnread }) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notificationsCount"] });

      const previousListSnapshots = queryClient.getQueriesData<NotificationsInfiniteData>({
        queryKey: ["notifications"],
      }) as Snapshot<NotificationsInfiniteData>[];
      const previousCountSnapshots = queryClient.getQueriesData<CountQueryData>({
        queryKey: ["notificationsCount"],
      }) as Snapshot<CountQueryData>[];

      queryClient.setQueriesData<NotificationsInfiniteData>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page, idx) => {
              if (!page?.data) return page;
              const result = (page.data.result || []).filter((n) => n.id !== id);
              const hadIt = (page.data.result || []).length !== result.length;
              return {
                ...page,
                data: {
                  ...page.data,
                  result,
                  total_count:
                    hadIt && typeof page.data.total_count === "number"
                      ? Math.max(0, page.data.total_count - 1)
                      : page.data.total_count,
                  unread_count:
                    idx === 0 && wasUnread
                      ? Math.max(0, (page.data.unread_count ?? 0) - 1)
                      : page.data.unread_count,
                },
              };
            }),
          };
        },
      );

      if (wasUnread) {
        queryClient.setQueriesData<CountQueryData>(
          { queryKey: ["notificationsCount"] },
          (old) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: {
                ...old.data,
                unread_count: Math.max(0, (old.data.unread_count ?? 0) - 1),
              },
            };
          },
        );
      }

      return { previousListSnapshots, previousCountSnapshots };
    },
    onError: (err, _vars, context) => {
      if (isUnauthenticatedError(err)) openGate("manage notifications");
      context?.previousListSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      context?.previousCountSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await ensureValidToken();
      return clearNotification();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notificationsCount"] });

      const previousListSnapshots = queryClient.getQueriesData<NotificationsInfiniteData>({
        queryKey: ["notifications"],
      }) as Snapshot<NotificationsInfiniteData>[];
      const previousCountSnapshots = queryClient.getQueriesData<CountQueryData>({
        queryKey: ["notificationsCount"],
      }) as Snapshot<CountQueryData>[];

      // Clear All wipes everything server-side, so empty every cached list page
      // and zero the badge count immediately.
      queryClient.setQueriesData<NotificationsInfiniteData>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              if (!page?.data) return page;
              return {
                ...page,
                data: { ...page.data, result: [], total_count: 0, unread_count: 0 },
              };
            }),
          };
        },
      );
      queryClient.setQueriesData<CountQueryData>(
        { queryKey: ["notificationsCount"] },
        (old) => {
          if (!old?.data) return old;
          return { ...old, data: { ...old.data, unread_count: 0 } };
        },
      );

      return { previousListSnapshots, previousCountSnapshots };
    },
    onError: (err, _vars, context) => {
      if (isUnauthenticatedError(err)) openGate("manage notifications");
      context?.previousListSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      context?.previousCountSnapshots?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSuccess: () => {
      setShowClearAllModal(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
    },
  });

  /* ---------------- INTERSECTION OBSERVER FOR INFINITE SCROLL ---------------- */
  useEffect(() => {
    if (!observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* ---------------- PROCESS DATA ---------------- */
  const allBackendNotifications =
    notificationsData?.pages
      ?.flatMap((page): BackendNotification[] => page?.data?.result || [])
      .filter((notif) => notif.notification_details?.type !== "new_message") ??
    [];

  const allNotifications = allBackendNotifications.map(transformNotification);
  console.log("All Notifications:", allNotifications);

  const totalNotifications =
    notificationsData?.pages[0]?.data?.total_count || 0;

  const filteredNotifications = allNotifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "jobs") return notification.type === "job";
    if (activeTab === "connections") return notification.type === "connection";
    return true;
  });

  const jobsCount = allNotifications.filter((n) => n.type === "job").length;
  const connectionsCount = allNotifications.filter(
    (n) => n.type === "connection",
  ).length;

  /* ---------------- HANDLERS ---------------- */
  const handleTabChange = (tab: TabType) => setActiveTab(tab);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      ensureAuthed("mark notifications read", () =>
        toggleReadMutation.mutate({
          id: notification.id,
          readStatus: "1",
          previousReadStatus: "0",
        }),
      );
    }
    if (notification.details_type === "booking_confirmed") {
      if (notification.action_url) {
        router.push(notification.action_url);
      }
      return;
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      return;
    }
    if (notification.type === "admin") {
      setSelectedNotification(notification);
      return;
    }
  };

  const handleClearNotificationClick = (notification: Notification) => {
    ensureAuthed("clear this notification", () =>
      clearNotificationMutation.mutate({
        id: notification.id,
        wasUnread: !notification.is_read,
      }),
    );
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.details_type === "booking_confirmed") {
      return (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "10px",
            background: "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(32, 189, 255, 0.35)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40px" height="40px" viewBox="0 0 24 24"><path fill="#FFF" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8z"></path></svg>
        </div>
      );
    }
    switch (notification.type) {
      case "job":
        return (
          <div
            className={`flex items-center justify-center w-full h-full rounded-full text-white font-semibold select-none ${notificationStyles.notification_avatar}`}
            style={{
              background: "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
              fontSize: 22,
            }}
          >
            YA
          </div>
        );
      case "connection":
        return (
          <Avatar
            imageUrl={notification.avatar_url || null}
            firstName={notification.sender_first_name}
            lastName={notification.sender_last_name}
            className={`w-full h-full object-cover ${notificationStyles.notification_avatar}`}
          />
        );
      case "admin":
        return (
          <div
            className={`flex items-center justify-center w-full h-full rounded-full text-white select-none ${notificationStyles.notification_avatar}`}
            style={{
              background: "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g fill="none" fillRule="evenodd">
                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                <path
                  fill="currentColor"
                  d="M15.992 3.013C17.326 2.236 19 3.197 19 4.741V8a3 3 0 1 1 0 6v3c0 1.648-1.881 2.589-3.2 1.6l-2.06-1.546A8.66 8.66 0 0 0 10 15.446v2.844a2.71 2.71 0 0 1-5.316.744l-1.57-5.496a4.7 4.7 0 0 1 3.326-7.73l3.018-.168a9.34 9.34 0 0 0 4.19-1.259zM5.634 15.078l.973 3.407A.71.71 0 0 0 8 18.29v-3.01l-1.56-.087a5 5 0 0 1-.806-.115M20 11a1 1 0 0 0-1-1v2a1 1 0 0 0 1-1"
                />
              </g>
            </svg>
          </div>
        );
      default:
        return (
          // <Image
          //   src={DefaultNotification}
          //   alt="Avatar"
          //   width={64}
          //   height={64}
          //   className="object-cover rounded-3xl"
          //   unoptimized
          // />
              <div
            className={`flex items-center justify-center w-full h-full rounded-full text-white font-semibold select-none ${notificationStyles.notification_avatar}`}
            style={{
              background: "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
              fontSize: 22,
            }}
          >
            YA
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div
        className={`${styles.jobListing_main_section_wrapper} max-content-height`}
      >
        <div className="flex flex-wrap -mx-2 mt-6" style={{ height: "100%" }}>
          {/* Sidebar */}
          {showSidebar && (
            <div
              className="full-width-midium col-lg-4"
              style={{ height: "100%" }}
            >
              <aside className={styles.sidebar_main_section}>
                <ProfileCardsmall />
              </aside>
            </div>
          )}

          {/* Main Content */}
          <div
            className={`full-width-midium ${showSidebar ? "col-lg-8" : "col-lg-12"}`}
          >
            <main className={styles.jobListing_main_section}>
              <div className={styles.jobListing_job_list_header}>
                <div className="col-lg-6">
                  <h1 className={styles.jobListing_main_section_title} style={{ color: isLight ? '#040F1F' : '#fff' }}>
                    {activeTab === "all" && "All Notifications"}
                    {activeTab === "jobs" && "Job Notifications"}
                    {activeTab === "connections" && "Connection Notifications"}
                  </h1>
                </div>
                <div className="col-lg-6 search-flex">
                  <div className={styleSheet.search_panel_area}>
                    <form
                      className={styleSheet.search_form}
                      onSubmit={(e) => e.preventDefault()}
                    >
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
                        placeholder="Search "
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={styleSheet.search_panel}
                      />
                      {searchInput && (
                        <button
                          type="button"
                          onClick={() => setSearchInput("")}
                          className={styleSheet.clear_search_button}
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4 cursor-pointer mt-[-3px]" />
                        </button>
                      )}
                    </form>
                  </div>
                  {allNotifications.length > 1 && (
                    <button
                      onClick={() => setShowClearAllModal(true)}
                      disabled={clearAllMutation.isPending}
                      className={styleSheet.clear_filters_button}
                      style={{ color: isLight ? '#040F1F' : '#fff' }}
                    >
                      {clearAllMutation.isPending ? "Clearing..." : "Clear All"}
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              {notificationsLoading ? (
                <>
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                </>
              ) : error ? (
                <div className="text-red-400 text-center py-8">
                  Failed to load notifications. Please try again.
                </div>
              ) : (
                <>
                  <div className={styles.jobListing_job_list}>
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification) => {
                        const isUnread = !notification.is_read;
                        const isClearing =
                          clearNotificationMutation.isPending &&
                          clearNotificationMutation.variables?.id ===
                            notification.id;
                        const mutedIcon = isLight ? "#64748b" : "#9aa6b6";
                        const accent = isLight ? "#356FEE" : "#20BDFF";
                        return (
                          <div
                            key={notification.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNotificationClick(notification)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleNotificationClick(notification);
                              }
                            }}
                            className={`${styles.jobListing_job_item} card-hover`}
                            style={{
                              cursor: "pointer",
                              backgroundColor: isUnread
                                ? isLight
                                  ? "rgba(53, 111, 238, 0.05)"
                                  : "rgba(32, 189, 255, 0.05)"
                                : undefined,
                              transition: "background-color 0.2s ease",
                            }}
                          >
                            <div className={styles.jobListing_job_item_main}>
                              <div className={styles.jobListing_job_item_logo}>
                                {notification.details_type ===
                                "booking_confirmed" ? (
                                  getNotificationIcon(notification)
                                ) : notification.avatar_url ? (
                                  <Image
                                    src={notification.avatar_url}
                                    alt="Avatar"
                                    width={64}
                                    height={64}
                                    className="object-cover rounded-3xl"
                                    unoptimized
                                  />
                                ) : (
                                  <div
                                    className={
                                      styles.jobListing_job_item_logo
                                    }
                                  >
                                    {getNotificationIcon(notification)}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex gap-2 items-center">
                                  {isUnread && (
                                    <span
                                      aria-label="Unread"
                                      title="Unread"
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        backgroundColor: accent,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  {notification.sender_name && (
                                    <h3
                                      className={`${styles.jobListing_job_item_title}`}
                                      style={{
                                        color: isLight ? "#040F1F" : "",
                                        fontWeight: isUnread ? 700 : 500,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        overflow: "visible",
                                        textOverflow: "clip",
                                      }}
                                    >
                                      {`${toTitleCase(notification.sender_name)} -`}
                                    </h3>
                                  )}
                                  <h3
                                    className={`${styles.jobListing_job_item_title}`}
                                    style={{
                                      color: isLight ? "#040F1F" : "",
                                      fontWeight: isUnread ? 700 : 500,
                                    }}
                                  >
                                    {notification.title}
                                  </h3>
                                </div>
                                <div
                                  className={`${styles.jobListing_job_item_meta} mb-2`}
                                >
                                  <p
                                    className={
                                      styles.jobListing_job_item_company
                                    }
                                    style={{
                                      color: isLight ? "#888888" : "",
                                      opacity: isUnread ? 1 : 0.85,
                                    }}
                                  >
                                    {notification.message}
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className="text-[12px] text-[#A0AEC0]"
                                    style={{
                                      color: isLight ? "#888888" : "",
                                    }}
                                  >
                                    {timeAgo(notification.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {notification.action_url && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationClick(notification);
                                    }}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 20,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      background: isLight ? "#356FEE" : "#20BDFF",
                                      color: "#fff",
                                      border: "none",
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearNotificationClick(notification);
                                  }}
                                  disabled={isClearing}
                                  aria-label="Delete notification"
                                  title="Delete notification"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background: "transparent",
                                    color: mutedIcon,
                                    cursor: isClearing
                                      ? "not-allowed"
                                      : "pointer",
                                    opacity: isClearing ? 0.4 : 0.55,
                                    border: "none",
                                    transition:
                                      "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      isLight
                                        ? "rgba(239, 68, 68, 0.1)"
                                        : "rgba(239, 68, 68, 0.15)";
                                    e.currentTarget.style.color = "#ef4444";
                                    e.currentTarget.style.opacity = "1";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                    e.currentTarget.style.color = mutedIcon;
                                    e.currentTarget.style.opacity = isClearing
                                      ? "0.4"
                                      : "0.55";
                                  }}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '20px 0', minHeight: '60vh', width: '100%' }}>
                        <BellOff
                          size={24}
                          strokeWidth={2}
                          style={{ opacity: 0.5 }}
                          color={isLight ? '#040F1F' : '#cbd5e1'}
                        />
                        <p style={{ color: isLight ? '#040F1F' : 'rgb(144 161 185)', margin: 0, fontWeight: '600' }}>
                          {searchInput && searchInput.length >= 2
                            ? `No results found`
                            : "No notifications yet"}
                        </p>
                        {searchInput && searchInput.length >= 2 && (
                          <p style={{ color: isLight ? '#555' : 'rgb(144 161 185)', margin: 0, fontSize: '12px' }}>
                            Try a different search term
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {hasNextPage && (
                    <div
                      ref={observerTarget}
                      className="flex justify-center py-4"
                    >
                      {isFetchingNextPage && (
                        <LoaderCircle className="w-6 h-6 text-white animate-spin" />
                      )}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ── Admin Notification Detail Modal ── */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: isLight ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="relative rounded-2xl w-[90%] max-w-sm overflow-hidden"
            style={{
              background: isLight
                ? "#ffffff"
                : "#040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat",
              border: isLight
                ? "1px solid rgba(0,0,0,0.1)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isLight
                ? "0 24px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)"
                : "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              animation: "popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedNotification(null)}
              className={`absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isLight ? "hover:bg-black/5" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <X className={`w-4 h-4 ${isLight ? "text-[#64748b]" : "text-[#9ca3af]"}`} />
            </button>

            <div className="px-8 pt-8 pb-7">
              <div className={notificationStyles.notification_admin_popup}>
                {/* <Image
                  src={DefaultNotification}
                  alt="Notification"
                  width={56}
                  height={56}
                  className="rounded-2xl"
                  unoptimized
                /> */}
                {selectedNotification.type === "admin" ? (
                  <div
                    className="flex items-center justify-center rounded-full text-white select-none"
                    style={{
                      width: 40,
                      height: 40,
                      background:
                        "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <g fill="none" fillRule="evenodd">
                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                        <path
                          fill="currentColor"
                          d="M15.992 3.013C17.326 2.236 19 3.197 19 4.741V8a3 3 0 1 1 0 6v3c0 1.648-1.881 2.589-3.2 1.6l-2.06-1.546A8.66 8.66 0 0 0 10 15.446v2.844a2.71 2.71 0 0 1-5.316.744l-1.57-5.496a4.7 4.7 0 0 1 3.326-7.73l3.018-.168a9.34 9.34 0 0 0 4.19-1.259zM5.634 15.078l.973 3.407A.71.71 0 0 0 8 18.29v-3.01l-1.56-.087a5 5 0 0 1-.806-.115M20 11a1 1 0 0 0-1-1v2a1 1 0 0 0 1-1"
                        />
                      </g>
                    </svg>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center rounded-full text-white font-semibold select-none"
                    style={{
                      width: 40,
                      height: 40,
                      background:
                        "linear-gradient(135deg, #20BDFF 0%, #5B7CFF 100%)",
                      fontSize: 16,
                    }}
                  >
                    YA
                  </div>
                )}
                {selectedNotification.type === "admin" ? (
                  <p className="text-[#20BDFF] text-sm mb-2 word-break">
                    Young Pro
                  </p>
                ) : (
                  selectedNotification.sender_name && (
                    <p className="text-[#20BDFF] text-sm mb-2 word-break">
                      {toTitleCase(selectedNotification.sender_name)}
                    </p>
                  )
                )}
              </div>
              <div
                style={{ height: "250px", overflow: "auto" }}
                className="hide-scrollbar"
              >
                <h2
                  className="font-semibold mb-2"
                  style={{
                    fontSize: "1.15rem",
                    letterSpacing: "-0.01em",
                    color: isLight ? "#0f172a" : "#f1f1f3",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedNotification.title}
                </h2>
                <p
                  style={{
                    color: isLight ? "#64748b" : "#9ca3af",
                    fontSize: "0.875rem",
                    lineHeight: "1.6",
                    marginBottom: "1.25rem",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedNotification.message}
                </p>
              </div>
            </div>

            <style>{`
              @keyframes popIn {
                from { opacity: 0; transform: scale(0.85) translateY(16px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* ── Clear All Confirmation Modal ── */}
      <ConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={() =>
          ensureAuthed("clear this notification", () => clearAllMutation.mutate())
        }
        title="Clear All Notifications?"
        message="Are you sure you want to remove all notifications? This action cannot be undone."
        confirmText="Remove All"
        cancelText="Cancel"
        isLoading={clearAllMutation.isPending}
        loadingText="Removing..."
      />

      {authGateModal}
    </div>
  );
};

export default Notifications;
