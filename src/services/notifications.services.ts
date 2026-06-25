// src/services/notifications.services.ts
//
// Migrated to strict Server Actions in src/app/actions/notifications.ts — this
// file no longer uses raw fetch("/api/*"). Each action returns the gateway
// envelope { status, code?, message?, data } whose `data` is the verbatim
// backend body; the services unwrap `res.data` to preserve the exact shape the
// call sites consume. A logged-out caller surfaces as an UnauthenticatedError
// so the client can open its login gate (never force-logout — REQUIREMENTS §5 R4).

import {
  fetchNotificationsAction,
  setNotificationReadStatusAction,
  clearNotificationAction,
} from "@/app/actions/notifications";
import { UnauthenticatedError } from "@/lib/authError";

export interface NotificationSender {
  id: string;
  // User sender
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  profile_image_url?: string | null;
  profile_completion_status?: string;
  // Company sender
  name?: string;
  description?: string;
  logo_url?: string;
}

export interface BackendNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  sender: NotificationSender[];
  type: string; // "push", etc.
  sender_type: "user" | "company";
  read_status?: "0" | "1";
}

export interface NotificationsResponse {
  status: string;
  message: string;
  data: {
    count: number;
    total_count: number;
    unread_count: number;
    result: BackendNotification[];
  };
}

export type ReadStatus = "0" | "1";

export interface ReadStatusResponse {
  status: string;
  message: string;
  data: { read_status: ReadStatus };
}

/**
 * Fetch notifications with pagination and search
 */
export const fetchNotifications = async ({
  page = 1,
  limit = 20,
  searchText,
}: {
  page?: number;
  limit?: number;
  searchText?: string;
}): Promise<NotificationsResponse> => {
  const res = await fetchNotificationsAction({
    page,
    limit,
    search_text: searchText,
  });
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch notifications");
  }
  return res.data as NotificationsResponse;
};

/**
 * Toggle a notification's read state for the current user.
 * read_status "1" inserts the read row; "0" removes it. Idempotent.
 */
export const setNotificationReadStatus = async (
  id: string,
  read_status: ReadStatus
): Promise<ReadStatusResponse> => {
  const res = await setNotificationReadStatusAction(id, read_status);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to update read status");
  }
  return res.data as ReadStatusResponse;
};





export const clearNotification = async (
  notificationId?: string
): Promise<{ success: boolean }> => {
  const res = await clearNotificationAction(notificationId);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to clear notification");
  }
  return (res.data ?? { success: true }) as { success: boolean };
};