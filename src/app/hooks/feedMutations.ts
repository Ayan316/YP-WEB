import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addReaction,
  repost,
  addComment,
  fetchComments,
  deleteComment,
  ReactionPayload
} from '@/services/feeds.services'
import { isUnauthenticatedError } from '@/lib/authError'
import { toast } from 'react-toastify'

// The feed write call sites (FeedPostComponent / FeedGallery) already gate on
// auth proactively via useAuthGate's `ensureAuthed`, which prompts login for
// anonymous users BEFORE the mutation fires. The server gateway is the backstop:
// if a session lapses mid-flight it returns code:"UNAUTHENTICATED", which the
// service rethrows as an UnauthenticatedError. We suppress the generic error
// toast for that case (the proactive gate handles the prompt) and NEVER
// force-logout the user (REQUIREMENTS §5 R4).

/**
 * Hook for adding reactions to feed posts
 * Optimistically updates cache and handles rollback on error
 */
export const useAddReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReactionPayload) => {
      return await addReaction(payload)
    },
    onSuccess: () => {
      // Invalidate feeds to sync any changes
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      // toast.success('Reaction added')
    },
    onError: (error: any) => {
      console.error('❌ Error adding reaction:', error)
      if (isUnauthenticatedError(error)) return
      const errorMsg = error?.message || 'Failed to add reaction'
      toast.error(errorMsg)
    }
  })
}

/**
 * Hook for reposting feed items
 * Checks if already reposted before allowing action
 */
export const useRepost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; type: string; action: string }) => {
      return await repost(payload)
    },
    onSuccess: (data, variables) => {
      // Invalidate feeds to sync any changes
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      toast.success(
        variables.action === 'remove'
          ? 'Repost removed'
          : 'Reposted successfully'
      )
    },
    onError: (error: any) => {
      console.error('❌ Error reposting:', error)
      if (isUnauthenticatedError(error)) return
      const errorMsg = error?.message || 'Failed to repost'
      toast.error(errorMsg)
    }
  })
}

/**
 * Hook for adding comments with or without attachments
 * Properly handles FormData for file uploads
 */
export const useAddComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      id: string
      body: string
      attachments?: File
    }) => {
      // The service now handles FormData conversion internally
      return await addComment(payload)
    },
    onSuccess: (data, variables) => {
      // console.log('✅ Comment added:', data)
      // toast.success('Comment added successfully')

      // Invalidate comments for this feed
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.id]
      })
      // Also invalidate feeds to update comment counts
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error: any) => {
      console.error('❌ Error adding comment:', error)
      if (isUnauthenticatedError(error)) return
      const errorMsg = error?.message || 'Failed to add comment'
      toast.error(errorMsg)
    }
  })
}

/**
 * Hook for deleting a comment
 * Invalidates comments and feeds queries on success
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; action: string; feedId?: string }) => {
      return await deleteComment(payload)
    },
    onSuccess: (data, variables) => {
      // console.log('✅ Comment deleted:', data)
      // toast.success('Comment deleted successfully')

      // Invalidate comments for this feed so deleted comments don't reappear on re-fetch
      if (variables.feedId) {
        queryClient.invalidateQueries({
          queryKey: ['comments', variables.feedId]
        })
      }
      // Also invalidate feeds to update comment counts
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error: any) => {
      console.error('❌ Error deleting comment:', error)
      if (isUnauthenticatedError(error)) return
      const errorMsg = error?.message || 'Failed to delete comment'
      toast.error(errorMsg)
    }
  })
}

/**
 * Hook for fetching comments for a specific feed
 * Can be used with useInfiniteQuery for pagination
 */
export const useFetchComments = () => {
  return useMutation({
    mutationFn: async (payload: {
      id: string
      limit?: number
      page?: number
    }) => {
      return await fetchComments(payload)
    },
    onError: (error: any) => {
      console.error('❌ Error fetching comments:', error)
    }
  })
}