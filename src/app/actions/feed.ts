"use server";

// Read Server Actions for the public Feed domain (REQUIREMENTS §4.4).
//
// Replaces `src/app/api/{fetch-all-post,comments-list}` proxy routes. Soft auth
// so the feed + comments are viewable anonymously (REQUIREMENTS §5 R4) while a
// logged-in user gets their own reaction/repost state embedded.
//
// `loadFeed` reproduces the old proxy's NORMALISED envelope shape
//   { data, total_count, page, limit, has_next_page }
// so the FeedPostComponent infinite-scroll call site is unchanged (it reads
// `page.data.result` and `lastPage.total_count`). `fetchComments` passes the
// backend body through verbatim (the call sites read `.data.result` | `.data`).

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";
import type { ApiResult } from "@/lib/api";

export interface FeedsPayload {
  limit?: number;
  page?: number;
  search_text?: string;
  id?: string;
}

interface NormalisedFeed {
  // `data` mirrors the old proxy: it is the backend body's `.data` (which holds
  // `{ result, total_count }`) — typed `any` so the FeedPostComponent call site
  // that reads `page.data.result` keeps its original (axios `any`) ergonomics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  total_count: number;
  page: number;
  limit: number;
  has_next_page: boolean;
}

/**
 * POST /api/web/feeds — public feed listing (infinite scroll + search).
 *
 * Returns the api.* envelope whose `data` is the same NORMALISED object the old
 * proxy produced, so the consumer's `page.data.result` / `lastPage.total_count`
 * access keeps working.
 */
export async function loadFeed(
  payload: FeedsPayload,
): Promise<ApiResult<NormalisedFeed>> {
  const page = payload?.page || 1;
  const limit = payload?.limit || 10;
  const search_text = payload?.search_text || "";

  const requestBody: Record<string, unknown> = {
    page,
    limit,
    ...(search_text && { search_text }),
  };

  const res = await api.post<Record<string, unknown>>(EP.feed, requestBody, {
    auth: "soft",
  });

  if (res.status !== "OK") {
    return { ...res, data: null };
  }

  const backend = (res.data ?? {}) as Record<string, unknown>;
  const totalCount =
    (backend?.total_count as number) ?? (backend?.count as number) ?? 0;

  const normalised: NormalisedFeed = {
    data: backend?.data ?? backend ?? [],
    total_count: totalCount,
    page,
    limit,
    has_next_page:
      backend?.has_next_page !== undefined
        ? Boolean(backend.has_next_page)
        : page * limit < totalCount,
  };

  return { status: "OK", data: normalised };
}

/** POST /api/web/user/feed/comments — comments for a feed post (paginated). */
export async function fetchCommentsAction(payload: {
  id: string;
  limit?: number;
  page?: number;
}) {
  // Pass the backend comments body through verbatim — `data` is `any` so the
  // call sites that read `.data.result` | `.data` keep their original (axios
  // `any`) ergonomics (same rationale as NormalisedFeed.data above).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.commentsList, payload, { auth: "soft" });
}

// ---------------------------------------------------------------------------
// Gated feed write actions (auth:"strict" — REQUIREMENTS §4.3).
//
// Replace the old strict proxy routes reaction, add-comment, delete-comment,
// repost. Each returns the unchanged `{ status, code?, message?, data }`
// envelope; a logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit)
// which the client maps to its login gate (never force-logout).
//
// These mutate the home feed, which is read from interactive client TanStack
// queries (FeedPostComponent / FeedGallery infinite scroll), so they keep the
// existing query invalidation in feedMutations.ts and are NOT revalidated here.
//
// `data` is typed `any` because the backend feed write bodies are genuinely
// untyped at the call sites (same documented exception as loadFeed above).
// ---------------------------------------------------------------------------

export interface ReactionPayload {
  id: string;
  type: string;
  action: string;
}

/** POST /api/mobile/user/feed/reaction — like/react toggle on a post. */
export async function addReactionAction(payload: ReactionPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.reaction, payload, { auth: "strict" });
}

/**
 * POST /api/mobile/user/feed/add-comment — add a comment, optionally with a
 * file attachment. Multipart when a File is present (api.postForm), otherwise
 * JSON. Mirrors the old proxy's two branches.
 */
export async function addCommentAction(payload: {
  id: string;
  body: string;
  attachments?: File;
}) {
  if (payload.attachments instanceof File) {
    const formData = new FormData();
    formData.append("id", payload.id);
    formData.append("body", payload.body);
    formData.append("attachments", payload.attachments);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return api.postForm<any>(EP.addComment, formData, { auth: "strict" });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(
    EP.addComment,
    { id: payload.id, body: payload.body },
    { auth: "strict" },
  );
}

/**
 * Delete a comment.
 *
 * TODO(verify): backend delete-comment path. The original proxy POSTed to
 * `/api/mobile/user/feed/update-comment` (an UPDATE endpoint) and relied on a
 * body `action` flag to perform the delete. No backend source is available to
 * confirm a dedicated delete route, so we PRESERVE the working path (EP.updateComment)
 * rather than guess and break a live feature. Swap to a real delete endpoint
 * once the backend confirms one. See artifacts/migration-map.json confirmedBugs.
 */
export async function deleteCommentAction(payload: {
  id: string;
  action: string;
  feedId?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.updateComment, payload, { auth: "strict" });
}

/** POST /api/mobile/user/feed/share — repost / un-repost a feed item. */
export async function repostAction(payload: {
  id: string;
  type: string;
  action: string;
}) {
  // Default `action` to "add" to match the old proxy's backward-compat default.
  const body = { ...payload, action: payload.action || "add" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.repost, body, { auth: "strict" });
}
