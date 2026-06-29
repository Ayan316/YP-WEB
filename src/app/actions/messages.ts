"use server";

// Gated messaging Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   messages/messages-list      → user/conversation
//   messages/all-message-users  → user/conversations
//   messages/search-connected-users → user/conversations   (DUP — see below)
//   messages/send-message       → user/conversation/add-message  (multipart)
//
// DUP FIX (REQUIREMENTS §11 bug #2 / migration-map confirmedBugs): the old
// `all-message-users` and `search-connected-users` routes BOTH POSTed to the
// same backend endpoint `user/conversations` — the only difference was that
// search added a `{ search_text }` body. They are collapsed here into ONE
// action `getConversationsAction(searchText?)`; both call sites (MessageClient /
// hasUnseenMessages and ConversationList) now go through it.
//
// Each action returns the unchanged `{ status, code?, message?, data }`
// envelope whose `data` is the verbatim backend body; a logged-out caller gets
// `code:"UNAUTHENTICATED"` (no network hit) which the client maps to its login
// gate (never force-logout). The conversations/messages screens are interactive
// client TanStack queries, so they keep their existing query invalidation and
// are NOT revalidated here.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

// The backend conversation/message bodies are dynamic at the call sites
// (MessageClient reads `response.data.result`, ChatPanel reads
// `messagesData?.data?.result`); `data` is `any` to preserve the original axios
// pass-through ergonomics — same documented exception as src/app/actions/feed.ts.

/**
 * POST /api/mobile/user/conversations — the user's conversation list.
 *
 * Collapses the former all-message-users + search-connected-users routes: pass
 * an optional `searchText` to filter (forwarded to the backend as
 * `{ search_text }`, exactly as the old search route did); omit it for the full
 * list (the old all-message-users route sent no body).
 */
export async function getConversationsAction(searchText?: string) {
  const trimmed = searchText?.trim();
  const body = trimmed ? { search_text: trimmed } : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.conversations, body, { auth: "strict" });
}

/** POST /api/mobile/user/conversation — messages in a 1:1 conversation. */
export async function fetchMessagesByUserAction(payload: {
  peer_id: string;
  page?: number;
  limit?: number;
}) {
  const body = {
    peer_id: payload.peer_id,
    ...(payload.page ? { page: payload.page } : {}),
    ...(payload.limit ? { limit: payload.limit } : {}),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.conversation, body, { auth: "strict" });
}

/**
 * POST /api/mobile/user/conversation/add-message — send a message, optionally
 * with a media attachment. Always multipart (FormData) to preserve the file
 * upload, so it goes through api.postForm (do NOT JSON-stringify).
 */
export async function sendMessageAction(payload: {
  peer_id: string;
  message_text?: string;
  message_media?: File;
}) {
  const formData = new FormData();
  formData.append("peer_id", payload.peer_id);
  if (payload.message_text) {
    formData.append("message_text", payload.message_text);
  }
  if (payload.message_media instanceof File) {
    formData.append("message_media", payload.message_media);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.postForm<any>(EP.sendMessage, formData, { auth: "strict" });
}
