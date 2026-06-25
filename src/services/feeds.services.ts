// Every read AND write in this file is now migrated to Server Actions in
// src/app/actions/feed.ts — this file no longer uses axios or the client
// tokenManager (the server gateway owns refresh + Authorization). The strict
// feed writes surface the gateway's UNAUTHENTICATED signal by throwing an
// UnauthenticatedError so call sites can open the login gate (never
// force-logout — REQUIREMENTS §5 R4).
import {
  loadFeed,
  fetchCommentsAction,
  addReactionAction,
  addCommentAction,
  deleteCommentAction,
  repostAction,
} from '@/app/actions/feed'
import { UnauthenticatedError } from '@/lib/authError'

export interface FeedsPayload {
  limit?: number
  page?: number
  search_text?: string
  id?: string
}
export interface ReactionPayload {
  id: string
  type: string
  action: string
}

export const fetchFeeds = async (payload: FeedsPayload) => {
  // Migrated to Server Action `loadFeed` (soft auth → anonymous-friendly). The
  // action reproduces the old proxy's normalised envelope
  // { data, total_count, page, limit, has_next_page } as its `data`, so callers
  // that read `lastPage.total_count` and `page.data.result` are unchanged.
  const res = await loadFeed(payload)
  if (res.status !== 'OK') {
    throw new Error(res.message || 'Failed to fetch posts')
  }
  // Cast to `any` to retain the prior axios `res.data` ergonomics at the call
  // sites (which spread `page` and read `page.data.result`).
  return res.data as any
}

export const addReaction = async (payload: ReactionPayload) => {
  // Migrated to a strict Server Action. The old proxy returned { status, data }
  // and this service returned `res.data`; the action returns the same envelope,
  // so returning it whole preserves what feedMutations passes to onSuccess.
  const res = await addReactionAction(payload)
  if (res.status !== 'OK') {
    if (res.code === 'UNAUTHENTICATED') throw new UnauthenticatedError(res.message)
    throw new Error(res.message || 'Failed to add reaction')
  }
  return res
}


export const fetchComments = async (payload: {
  id: string
  limit?: number
  page?: number
}) => {
  // Migrated to Server Action (soft auth → comments viewable anonymously). The
  // action's `data` is the verbatim backend body; callers read `res?.data?.result`
  // or `res?.data` (array).
  const res = await fetchCommentsAction(payload)
  if (res.status !== 'OK') {
    throw new Error(res.message || 'Failed to fetch comments')
  }
  return res.data
}


export const addComment = async (payload: {
  id: string
  body: string
  attachments?: File
}) => {
  // Migrated to a strict Server Action. The action handles both branches (a File
  // attachment → multipart via api.postForm; text-only → JSON) internally, and
  // returns { status, data }; this service returns it whole (feedMutations only
  // invalidates queries, it does not read specific fields off the result).
  if (payload.attachments && !(payload.attachments instanceof File)) {
    throw new Error('attachments must be a File object')
  }
  const res = await addCommentAction(payload)
  if (res.status !== 'OK') {
    if (res.code === 'UNAUTHENTICATED') throw new UnauthenticatedError(res.message)
    throw new Error(res.message || 'Failed to add comment')
  }
  return res
}




export const deleteComment = async (payload: { id: string; action: string; feedId?: string }) => {
  // Migrated to a strict Server Action (which preserves the existing backend
  // path — see TODO(verify) in src/app/actions/feed.ts). Returns the { status,
  // data } envelope whole, as feedMutations expects.
  const res = await deleteCommentAction(payload)
  if (res.status !== 'OK') {
    if (res.code === 'UNAUTHENTICATED') throw new UnauthenticatedError(res.message)
    throw new Error(res.message || 'Failed to delete comment')
  }
  return res
}

export const repost = async (payload: { id: string; type: string; action: string }) => {
  // Migrated to a strict Server Action. Returns the { status, data } envelope
  // whole, as feedMutations expects.
  const res = await repostAction(payload)
  if (res.status !== 'OK') {
    if (res.code === 'UNAUTHENTICATED') throw new UnauthenticatedError(res.message)
    throw new Error(res.message || 'Failed to repost')
  }
  return res 
}