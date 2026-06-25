"use server";

// Gated moderation Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   user/block, user/unblock, user/blocked-list, user/report, user/my-reports.
// Each returns the unchanged `{ status, code?, message?, data }` envelope; a
// logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit) which the
// client maps to its login gate (never force-logout).
//
// block/unblock/report mutate the user's moderation state which is read from
// interactive client TanStack queries (e.g. the blocked-users page), so they
// keep the existing query invalidation and are not revalidated here.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export type ReportedType = "post" | "comment" | "message" | "user";

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "hate_speech"
  | "violence"
  | "other";

// The backend moderation bodies are dynamic at the call sites; `data` is `any`
// to preserve the original axios pass-through ergonomics (same documented
// exception as src/app/actions/feed.ts).

/** POST /api/mobile/user/block — block another user. */
export async function blockUserAction(blocked_user_id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.blockUser, { blocked_user_id }, { auth: "strict" });
}

/** POST /api/mobile/user/unblock — unblock a previously blocked user. */
export async function unblockUserAction(blocked_user_id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.unblockUser, { blocked_user_id }, { auth: "strict" });
}

/** POST /api/mobile/user/blocked-list — the user's blocked-users list. */
export async function fetchBlockedUsersAction(page = 1, limit = 20) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.blockedList, { page, limit }, { auth: "strict" });
}

/** POST /api/mobile/user/report — report a post/comment/message/user. */
export async function submitReportAction(payload: {
  reported_type: ReportedType;
  reported_id: string;
  reason: ReportReason;
  description?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.reportUser, payload, { auth: "strict" });
}

/** POST /api/mobile/user/my-reports — the user's submitted reports. */
export async function fetchMyReportsAction(page = 1, limit = 20) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.myReports, { page, limit }, { auth: "strict" });
}
