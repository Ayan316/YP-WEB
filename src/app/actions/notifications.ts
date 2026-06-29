"use server";

// Gated notifications Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   notifications, notifications/read-status, clear-notifications.
// Each returns the unchanged `{ status, code?, message?, data }` envelope; a
// logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit) which the
// client maps to its login gate (never force-logout).
//
// The notifications screen is an interactive client TanStack infinite query, so
// these keep the existing query invalidation in the component and are NOT
// revalidated here.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export type ReadStatus = "0" | "1";

/**
 * POST /api/mobile/notifications — paginated notifications (+ unread_count).
 * The action's `data` is the verbatim backend body `{ status, message, data:
 * { count, total_count, unread_count, result } }`; the service returns it whole.
 */
export async function fetchNotificationsAction(payload: {
  page?: number;
  limit?: number;
  search_text?: string;
}) {
  const body = {
    page: payload?.page ?? 1,
    limit: payload?.limit ?? 10,
    search_text: payload?.search_text,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.notifications, body, { auth: "strict" });
}

/** POST /api/mobile/notifications/read-status — toggle a notification's read row. */
export async function setNotificationReadStatusAction(
  id: string,
  read_status: ReadStatus,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(
    EP.notifRead,
    { id, read_status },
    { auth: "strict" },
  );
}

/**
 * POST /api/mobile/notifications/remove — clear one notification (when `id` is
 * given) or all of the user's notifications (no body).
 */
export async function clearNotificationAction(notificationId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(
    EP.notifRemove,
    notificationId ? { id: notificationId } : undefined,
    { auth: "strict" },
  );
}
