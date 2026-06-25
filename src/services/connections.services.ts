// src/services/connections.services.ts
//
// Migrated to strict Server Actions in src/app/actions/connections.ts — this
// file no longer uses the legacy axios client (removed). The actions surface the gateway's
// UNAUTHENTICATED signal by throwing an UnauthenticatedError so call sites can
// open the login gate (never force-logout — REQUIREMENTS §5 R4).
//
// SHAPE PRESERVED: the old connection proxies re-wrapped the backend body as
// `{ status: "OK", data: <backendBody> }`, and these services returned that
// wrapper (`res.data`). The actions reproduce the same wrapping, so the call
// sites (ConnectionList `queryData.data.data.result`, hasPendingConnections
// `res?.data?.data?.total_count`) keep working unchanged.

import {
  getUserConnectionsAction,
  receiveConnectionRequestsAction,
  sentConnectionRequestsAction,
  declinedConnectionRequestsAction,
  updateConnectionStatusAction,
  deleteConnectionsAction,
  sendConnectionAction,
} from "@/app/actions/connections";
import { UnauthenticatedError } from "@/lib/authError";

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

export const getUserConnections = async (payload: ConnectionsPayload) => {
  const res = await getUserConnectionsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch user connections");
  }
  return res.data;
};

export const receiveConnectionRequests = async (payload: ConnectionsPayload) => {
  const res = await receiveConnectionRequestsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch user connections");
  }
  return res.data;
};

export const sentConnectionRequests = async (payload: ConnectionsPayload) => {
  const res = await sentConnectionRequestsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch sent connections");
  }
  return res.data;
};

export const declinedConnectionRequests = async (
  payload: ConnectionsPayload,
) => {
  const res = await declinedConnectionRequestsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch user connections");
  }
  return res.data;
};

export const updateConnectionStatus = async (
  payload: ConnectionActionPayload,
) => {
  const res = await updateConnectionStatusAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to update connection status");
  }
  return res.data;
};

export const deleteConnections = async (payload: ConnectionActionPayload) => {
  const res = await deleteConnectionsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to delete connections");
  }
  return res.data;
};

export const sendConnection = async (payload: SendConnectionPayload) => {
  const res = await sendConnectionAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to send connection request");
  }
  return res.data;
};
