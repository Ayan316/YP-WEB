"use server";

// Gated connections Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes (all 7):
//   user_connections      → user/connections
//   receive_connections   → user/receive-connection-request
//   sent_connections      → user/send-connection-request
//   declined_connections  → user/declined-connection-request
//   sending_connection    → user/sending-connection
//   update_connection     → user/update-connection-status
//   delete_connection     → user/delete-connections
//
// SHAPE PRESERVED: the old connection proxies did NOT return the backend body
// verbatim — they re-wrapped it as `{ status: "OK", data: <backendBody> }`. The
// call sites depend on that double nesting (ConnectionList reads
// `queryData.data.data.result`; hasPendingConnections reads
// `res?.data?.data?.total_count`). To keep them working unchanged, these actions
// reproduce the SAME wrapping: the envelope `data` is `{ status:"OK", data:
// <backendBody> }`, and the rewired service returns `res.data` (= that wrapper).
//
// A logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit) which the
// client maps to its login gate (never force-logout). The connections screens
// are interactive client TanStack queries, so they keep their existing query
// invalidation and are NOT revalidated here.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";
import type { ApiResult } from "@/lib/api";

export interface ConnectionsPayload {
  page?: number;
  limit?: number;
  connection_status?: string;
  search_text?: string;
}

export interface ConnectionActionPayload {
  connection_id: string;
  status?: string;
}

export interface SendConnectionPayload {
  receiver_id: string;
  status?: string;
}

// The backend connection bodies are dynamic; `data` is `any` to preserve the
// original axios pass-through ergonomics (same documented exception as
// src/app/actions/feed.ts).

// Wrap a backend call so the envelope `data` matches the old proxy body
// `{ status: "OK", data: <backendBody> }` (see SHAPE PRESERVED note above).
async function wrapped(
  endpoint: string,
  payload: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ApiResult<{ status: "OK"; data: any }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(endpoint, payload, { auth: "strict" });
  if (res.status !== "OK") {
    return { ...res, data: null };
  }
  return { status: "OK", data: { status: "OK", data: res.data } };
}

/** POST /api/mobile/user/connections — the user's connections (paginated/search). */
export async function getUserConnectionsAction(payload: ConnectionsPayload) {
  return wrapped(EP.userConnections, payload);
}

/** POST /api/mobile/user/receive-connection-request — incoming requests. */
export async function receiveConnectionRequestsAction(
  payload: ConnectionsPayload,
) {
  return wrapped(EP.receiveConn, payload);
}

/** POST /api/mobile/user/send-connection-request — the user's sent requests. */
export async function sentConnectionRequestsAction(payload: ConnectionsPayload) {
  return wrapped(EP.sendConnection, payload);
}

/** POST /api/mobile/user/declined-connection-request — declined requests. */
export async function declinedConnectionRequestsAction(
  payload: ConnectionsPayload,
) {
  return wrapped(EP.declinedConn, payload);
}

/** POST /api/mobile/user/sending-connection — send a connection request. */
export async function sendConnectionAction(payload: SendConnectionPayload) {
  return wrapped(EP.sendingConn, payload);
}

/** POST /api/mobile/user/update-connection-status — accept/decline/withdraw. */
export async function updateConnectionStatusAction(
  payload: ConnectionActionPayload,
) {
  return wrapped(EP.updateConn, payload);
}

/** POST /api/mobile/user/delete-connections — remove a connection. */
export async function deleteConnectionsAction(payload: ConnectionActionPayload) {
  return wrapped(EP.deleteConn, payload);
}
