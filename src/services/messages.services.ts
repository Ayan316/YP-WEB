// Migrated to strict Server Actions in src/app/actions/messages.ts — this file
// no longer uses the legacy axios client (removed). The actions surface the gateway's UNAUTHENTICATED
// signal by throwing an UnauthenticatedError so call sites can open the login
// gate (never force-logout — REQUIREMENTS §5 R4).
//
// DUP COLLAPSED: fetchAllMessages and searchConnectedUsers previously hit the
// SAME backend endpoint (user/conversations) via two separate proxy routes.
// Both now call the single getConversationsAction (passing the search text
// through when present) — see src/app/actions/messages.ts.

import {
  getConversationsAction,
  fetchMessagesByUserAction,
  sendMessageAction,
} from "@/app/actions/messages";
import { UnauthenticatedError } from "@/lib/authError";

type FetchMessagesParams = {
  peer_id: string;
  page?: number;
  limit?: number;
};

type SendMessageParams = {
  peer_id: string;
  message_text?: string;
  message_media?: File; // image | audio | video | gif (future)
};

// The action's `data` is the verbatim backend body; the call sites read
// `response.data.result` (MessageClient / hasUnseenMessages) and
// `response?.data?.result ?? response?.result` (ConversationList), so the
// services return `res.data` to preserve that exact shape.

export const fetchAllMessages = async () => {
  // Full conversation list (no search) — the collapsed getConversationsAction.
  const res = await getConversationsAction();
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch messages");
  }
  return res.data;
};

export const fetchMessagesByUser = async ({
  peer_id,
  page,
  limit,
}: FetchMessagesParams) => {
  const res = await fetchMessagesByUserAction({ peer_id, page, limit });
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch messages by user");
  }
  return res.data;
};

export const sendMessage = async ({
  peer_id,
  message_text,
  message_media,
}: SendMessageParams) => {
  const res = await sendMessageAction({ peer_id, message_text, message_media });
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to send message");
  }
  return res.data;
};

export const searchConnectedUsers = async (query: string) => {
  // Same endpoint as fetchAllMessages — the collapsed getConversationsAction
  // with the search text forwarded as `{ search_text }`.
  const res = await getConversationsAction(query);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to search connected users");
  }
  return res.data;
};
