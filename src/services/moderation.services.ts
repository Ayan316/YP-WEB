// Migrated to strict Server Actions in src/app/actions/moderation.ts — this
// file no longer uses axios or the client tokenManager (the server gateway owns
// refresh + Authorization). The actions surface the gateway's UNAUTHENTICATED
// signal by throwing an UnauthenticatedError so call sites can open the login
// gate (never force-logout — REQUIREMENTS §5 R4).
import {
  blockUserAction,
  unblockUserAction,
  fetchBlockedUsersAction,
  submitReportAction,
  fetchMyReportsAction,
} from "@/app/actions/moderation";
import { UnauthenticatedError } from "@/lib/authError";

export type ReportedType = "post" | "comment" | "message" | "user";

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "hate_speech"
  | "violence"
  | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "violence", label: "Violence" },
  { value: "other", label: "Other" },
];

// The old proxies returned the backend body directly and these services
// returned `res.data`; each action returns { status, data: <backendBody> }, so
// returning `res.data` preserves the exact value the call sites consume.

export async function submitReport(payload: {
  reported_type: ReportedType;
  reported_id: string;
  reason: ReportReason;
  description?: string;
}) {
  const res = await submitReportAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to submit report");
  }
  return res.data;
}

export async function fetchMyReports(page = 1, limit = 20) {
  const res = await fetchMyReportsAction(page, limit);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch reports");
  }
  return res.data;
}

export async function blockUser(blocked_user_id: string) {
  const res = await blockUserAction(blocked_user_id);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to block user");
  }
  return res.data;
}

export async function unblockUser(blocked_user_id: string) {
  const res = await unblockUserAction(blocked_user_id);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to unblock user");
  }
  return res.data;
}

export async function fetchBlockedUsers(page = 1, limit = 20) {
  const res = await fetchBlockedUsersAction(page, limit);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch blocked users");
  }
  return res.data;
}
