import React, { useState, useCallback, useEffect, useRef } from 'react'
import styles from '@/moduleCss/feeds.module.css'
import Image from 'next/image'
import { getTimeAgo } from '@/helpers/getTimeAgo'
import ReadMoreCaption from './ReadMoreCaption'
import CompanyDefaultImg from '../../../public/images/company-logo-default.svg'
import { toast } from 'react-toastify'
import MediaUpload from '@/../public/images/media_upload.svg'
import { Trash2, X } from 'lucide-react'
import { fetchComments } from '@/services/feeds.services'
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import { type CarouselApi } from '@/components/ui/carousel'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import { useRouter } from 'next/navigation'
import Avatar from '../commonUI/Avatar'
import {
  useAddReaction,
  useRepost,
  useAddComment,
  useDeleteComment
} from '@/app/hooks/feedMutations'
import ConfirmModal from '../commonUI/ConfirmModal'
import ReportDialog from '../moderation/ReportDialog'
import { useTheme } from '@/context/ThemeContext'
import { useAuthGate } from '@/app/hooks/useAuthGate'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedData {
  id: string | number
  media_urls?: string[]
  author?: {
    logo_url?: string
    name?: string
    first_name?: string
    about?: string
    id?: string
    color_url?: string
  }
  created_at?: string
  text_content?: string
  post_counter?: {
    likes_count: string | number
    comments_count: string | number
    shares_count: string | number
  }
  activity?: {
    is_liked?: boolean
    is_shared?: boolean
    is_comment?: boolean
  }
  shared_list?: Array<{
    id: string
    full_name: string
    first_name: string
    last_name: string
    profile_image_url: string | null
  }>
  [key: string]: any
}

interface FeedGalleryProps {
  feed: FeedData
  onModalClose?: (state: {
    feedId: string | number
    likes: number
    comments: number
    shares: number
    isLiked: boolean
    isReposted: boolean
  }) => void
}

// ─── FeedGallery (thumbnail grid) ─────────────────────────────────────────────

const FeedGallery: React.FC<FeedGalleryProps> = ({ feed, onModalClose }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  )
  const mediaUrls = feed?.media_urls || []
  const imageCount = mediaUrls.length
    
  const handleImageClick = useCallback(
    (index: number) => setSelectedImageIndex(index),
    []
  )
  const handleCloseModal = useCallback(() => setSelectedImageIndex(null), [])

  const handlePrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedImageIndex(prev =>
        prev === null ? 0 : prev === 0 ? mediaUrls.length - 1 : prev - 1
      )
    },
    [mediaUrls.length]
  )

  const handleNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedImageIndex(prev =>
        prev === null ? 0 : prev === mediaUrls.length - 1 ? 0 : prev + 1
      )
    },
    [mediaUrls.length]
  )

  React.useEffect(() => {
    if (selectedImageIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevImage(e as any)
      if (e.key === 'ArrowRight') handleNextImage(e as any)
      if (e.key === 'Escape') handleCloseModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageIndex, handlePrevImage, handleNextImage, handleCloseModal])

  if (imageCount === 0) return null

  return (
    <>
      <div
        className={styles.feed_post_item_body_images}
        style={getGridStyle(imageCount)}
      >
        {mediaUrls.map((image, index) => {
          const isOverlay = imageCount >= 5 && index === 3
          const shouldHide = imageCount >= 5 && index > 3
          if (shouldHide) return null

          return (
            <div
              key={`${feed.id}-media-${index}`}
              className={styles.feed_post_item_body_images_item}
              style={getImageItemStyle(imageCount, index)}
              onClick={() => !isOverlay && handleImageClick(index)}
              role='button'
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  !isOverlay && handleImageClick(index)
              }}
              aria-label={`Image ${index + 1}`}
            >
              <Image
                src={image}
                width={300}
                height={300}
                alt={`post-image-${index}`}
                className={styles.feed_gallery_image}
                style={{
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {isOverlay && (
                <div
                  className={styles.feed_gallery_overlay}
                  onClick={() => handleImageClick(index)}
                >
                  <span className={styles.feed_gallery_overlay_text}>
                    +{imageCount - 4}
                  </span>
                </div>
              )}
              <div className={styles.feed_gallery_hover_effect} />
            </div>
          )
        })}
      </div>

      {selectedImageIndex !== null && (
        <ImageModal
          images={mediaUrls}
          currentIndex={selectedImageIndex}
          onClose={handleCloseModal}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
          feed={feed}
          onModalClose={onModalClose}
        />
      )}
    </>
  )
}

// ─── ImageModal ───────────────────────────────────────────────────────────────

interface ImageModalProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev: (e: React.MouseEvent) => void
  onNext: (e: React.MouseEvent) => void
  feed: FeedData
  onModalClose?: (state: {
    feedId: string | number
    likes: number
    comments: number
    shares: number
    isLiked: boolean
    isReposted: boolean
  }) => void
}

const ImageModal: React.FC<ImageModalProps> = ({
  images,
  currentIndex,
  onClose,
  feed,
  onModalClose
}) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: userProfileData } = useUserProfile()
  const loggedInUser =
    (userProfileData as any)?.data || (userProfileData as any)
  const feedId = feed.id.toString()

  // ─── Local interaction state ───────────────────────────────────────────────
  const [localLikesCount, setLocalLikesCount] = useState(
    feed.post_counter?.likes_count === 'None'
      ? 0
      : Number(feed.post_counter?.likes_count || 0)
  )
  const [localCommentsCount, setLocalCommentsCount] = useState(
    feed.post_counter?.comments_count === 'None'
      ? 0
      : Number(feed.post_counter?.comments_count || 0)
  )
  const [localSharesCount, setLocalSharesCount] = useState(
    feed.post_counter?.shares_count === 'None'
      ? 0
      : Number(feed.post_counter?.shares_count || 0)
  )
  const [isLiked, setIsLiked] = useState(feed.activity?.is_liked || false)
  const [isShared, setIsShared] = useState(feed.activity?.is_shared || false)

  // ─── Comment input state ───────────────────────────────────────────────────
  const [commentInput, setCommentInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [fullscreenCommentImage, setFullscreenCommentImage] = useState<
    string | null
  >(null)
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    commentId: string
  } | null>(null)
  const [reportDialog, setReportDialog] = useState<{
    type: 'post' | 'comment'
    id: string
  } | null>(null)
  const [unrepostConfirmModal, setUnrepostConfirmModal] = useState(false)
  const [api, setApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(currentIndex + 1)

  // ─── Auth gate ─────────────────────────────────────────────────────────────
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate()

  // ─── React Query mutations ─────────────────────────────────────────────────
  const addReactionMutation = useAddReaction()
  const repostMutation = useRepost()
  const addCommentMutation = useAddComment()
  const deleteCommentMutation = useDeleteComment()

  // ─── useInfiniteQuery: comments (API sends recent on top) ────────────────
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isError: commentsIsError,
    error: commentsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['comments', feedId],
    queryFn: async ({ pageParam }) => {
      const res = await fetchComments({
        id: feedId,
        limit: 5,
        page: pageParam as number
      })
      const items: any[] = Array.isArray((res as any)?.data?.result)
        ? (res as any).data.result
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray((res as any)?.result)
        ? (res as any).result
        : Array.isArray(res as any)
        ? (res as any)
        : []
      return items
    },
    getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
      _lastPage.length === 5 ? (lastPageParam as number) + 1 : undefined,
    initialPageParam: 1
  })

  // Pages are already in newest→oldest order; flatten directly
  const allComments = React.useMemo(() => {
    if (!commentsData?.pages) return []
    return commentsData.pages.flat()
  }, [commentsData])

  // ─── Carousel counter ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!api) return
    const update = () => setCurrentSlide(api.selectedScrollSnap() + 1)
    update()
    api.on('select', update)
    api.on('reInit', update)
    return () => {
      api.off('select', update)
      api.off('reInit', update)
    }
  }, [api])

  // ─── ESC for fullscreen image ──────────────────────────────────────────────
  useEffect(() => {
    if (!fullscreenCommentImage) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenCommentImage(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreenCommentImage])

  // ─── Close comment menu on outside click ──────────────────────────────────
  useEffect(() => {
    if (!commentMenuOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-comment-menu]'))
        setCommentMenuOpen(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [commentMenuOpen])

  // ─── Like ─────────────────────────────────────────────────────────────────
  const handleAddReaction = () => {
    ensureAuthed('like this post', () => {
      if (addReactionMutation.isPending) return
      const action = isLiked ? 'remove' : 'add'

      // Optimistic
      setIsLiked(action === 'add')
      setLocalLikesCount(prev =>
        action === 'add' ? prev + 1 : Math.max(0, prev - 1)
      )

      addReactionMutation.mutate(
        { id: feedId, type: 'like', action },
        {
          onError: () => {
            // Rollback
            setIsLiked(action !== 'add')
            setLocalLikesCount(prev =>
              action === 'add' ? Math.max(0, prev - 1) : prev + 1
            )
            toast.error('Failed to update reaction')
          }
        }
      )
    })
  }

  // ─── Repost ───────────────────────────────────────────────────────────────
  // const handleRepost = () => {
  //   if (repostMutation.isPending) return;

  //   // If already reposted, show the undo confirm modal instead
  //   if (isShared) {
  //     setUnrepostConfirmModal(true);
  //     return;
  //   }

  //   // Optimistic add
  //   setIsShared(true);
  //   setLocalSharesCount((prev) => prev + 1);

  //   repostMutation.mutate(
  //     { id: feedId, type: "repost", action: "add" },
  //     {
  //       // onSuccess: () => toast.success("Repost successfully"),
  //       onError: () => {
  //         setIsShared(false);
  //         setLocalSharesCount((prev) => Math.max(0, prev - 1));
  //         toast.error("Failed to repost");
  //       },
  //     },
  //   );
  // };

  // const handleUndoRepost = () => {
  //   if (repostMutation.isPending) return;

  //   // Optimistic remove
  //   setIsShared(false);
  //   setLocalSharesCount((prev) => Math.max(0, prev - 1));

  //   repostMutation.mutate(
  //     { id: feedId, type: "repost", action: "remove" },
  //     {
  //       // onSuccess: () => toast.success("Repost removed"),
  //       onError: () => {
  //         setIsShared(true);
  //         setLocalSharesCount((prev) => prev + 1);
  //         toast.error("Failed to remove repost");
  //       },
  //     },
  //   );
  // };\

  // Replace your existing handleUndoRepost function with this:

  const handleUndoRepost = () => {
    ensureAuthed('repost this', () => {
      if (repostMutation.isPending) return

      // Optimistic remove
      setIsShared(false)
      setLocalSharesCount(prev => Math.max(0, prev - 1))

      repostMutation.mutate(
        { id: feedId, type: 'repost', action: 'remove' },
        {
          onSuccess: () => {
            // Don't invalidate queries here — optimistic state is already correct.
            // The parent gets synced via handleModalClose → onModalClose callback.
          },
          onError: () => {
            setIsShared(true)
            setLocalSharesCount(prev => prev + 1)
            toast.error('Failed to remove repost')
          }
        }
      )
    })
  }

  // Also update handleRepost the same way to be consistent:

  const handleRepost = () => {
    ensureAuthed('repost this', () => {
      if (repostMutation.isPending) return

      if (isShared) {
        setUnrepostConfirmModal(true)
        return
      }

      // Optimistic add
      setIsShared(true)
      setLocalSharesCount(prev => prev + 1)

      repostMutation.mutate(
        { id: feedId, type: 'repost', action: 'add' },
        {
          onSuccess: () => {
            // No query invalidation — local state is the source of truth
          },
          onError: () => {
            setIsShared(false)
            setLocalSharesCount(prev => Math.max(0, prev - 1))
            toast.error('Failed to repost')
          }
        }
      )
    })
  }

  // ─── Add comment (optimistic via cache mutation) ───────────────────────────
  const handleAddComment = () => {
    ensureAuthed('comment on this post', () => {
    if (addCommentMutation.isPending) return
    const commentText = commentInput.trim()
    if (!commentText && !selectedFile) {
      toast.warning('Please enter a comment or attach an image')
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticComment = {
      _optimistic: true,
      _tempId: tempId,
      author: {
        id: loggedInUser?.id,
        first_name: loggedInUser?.first_name,
        last_name: loggedInUser?.last_name,
        about: loggedInUser?.about,
        profile_image_url: loggedInUser?.profile_image_url
      },
      comment_text: commentText,
      comment_media_urls: selectedFile
        ? [URL.createObjectURL(selectedFile)]
        : [],
      created_at: new Date().toISOString()
    }

    // Inject at top of first page
    queryClient.setQueryData(['comments', feedId], (old: any) => {
      if (!old) return old
      const [first = [], ...rest] = old.pages
      return { ...old, pages: [[optimisticComment, ...first], ...rest] }
    })
    setLocalCommentsCount(prev => prev + 1)

    // Reset input immediately (snappy UX)
    setCommentInput('')
    setSelectedFile(null)
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
      setFilePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    const textarea = document.querySelector(
      `[data-feed-id="${feedId}"]`
    ) as HTMLTextAreaElement
    if (textarea) textarea.style.height = '40px'

    addCommentMutation.mutate(
      {
        id: feedId,
        body: commentText,
        ...(selectedFile && { attachments: selectedFile })
      },
      {
        onSuccess: () => {
          // Replace optimistic entry with real data from server
          queryClient.invalidateQueries({ queryKey: ['comments', feedId] })
          // toast.success('Comment added!')
        },
        onError: () => {
          // Remove optimistic entry
          queryClient.setQueryData(['comments', feedId], (old: any) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page: any[]) =>
                page.filter((c: any) => c._tempId !== tempId)
              )
            }
          })
          setLocalCommentsCount(prev => Math.max(0, prev - 1))
          // toast.error('Failed to add comment')
        }
      }
    )
    })
  }

  // ─── Delete comment (optimistic via cache mutation) ────────────────────────
  const handleDeleteComment = (commentId: string) => {
    ensureAuthed('delete this comment', () => {
    setCommentMenuOpen(null)

    // Optimistic removal from cache
    queryClient.setQueryData(['comments', feedId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page: any[]) =>
          page.filter((c: any) => (c.id || c._id) !== commentId)
        )
      }
    })
    setLocalCommentsCount(prev => Math.max(0, prev - 1))

    deleteCommentMutation.mutate(
      { id: commentId, action: 'delete', feedId },
      {
        onError: () => {
          toast.error('Failed to delete comment. Please try again.')
          // Restore by re-fetching
          queryClient.invalidateQueries({ queryKey: ['comments', feedId] })
        }
      }
    )
    })
  }

  // ─── File helpers ─────────────────────────────────────────────────────────
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
      setFilePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Compact time helper ──────────────────────────────────────────────────
  const getCompactTimeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return 'now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    if (diff < 2419200) return `${Math.floor(diff / 604800)}w`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`
    return `${Math.floor(diff / 31536000)}y`
  }

  // ─── Sync state to parent on close ────────────────────────────────────────
  const handleModalClose = () => {
    onModalClose?.({
      feedId: feed.id,
      likes: localLikesCount,
      comments: localCommentsCount,
      shares: localSharesCount,
      isLiked,
      isReposted: isShared
    })
    onClose()
  }
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={styles.feed_gallery_modal}
      onClick={handleModalClose}
      role='dialog'
      aria-modal='true'
      aria-label='Post details'
    >
      <style>{`@keyframes commentSendSpin { to { transform: rotate(360deg); } }`}</style>
      <div
        className={styles.feed_gallery_modal_content}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className={styles.feed_gallery_modal_close}
          onClick={handleModalClose}
          aria-label='Close modal'
          title='Close (ESC)'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width={30}
            height={30}
            viewBox='0 0 16 16'
          >
            <path
              fill='none'
              stroke={isLight ? '#040F1F' : '#ffffff'}
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='1'
              d='m11.25 4.75-6.5 6.5m0-6.5 6.5 6.5'
            />
          </svg>
        </button>

        <div className={styles.feed_gallery_modal_image_container}>
          <div className={styles.feed_gallery_modal_image_container_wrapper}>
            {/* ── Carousel ── */}
            <div className={styles.feed_gallery_modal_image_container_image}>
              <div className={styles.feed_gallery_modal_figure}>
                <Carousel
                  setApi={setApi}
                  opts={{
                    align: 'start',
                    loop: true,
                    startIndex: currentIndex
                  }}
                  className='w-full h-full'
                >
                  <CarouselContent className='w-full h-full'>
                    {images.map((image, index) => (
                      <CarouselItem className='w-full h-full' key={index}>
                        <Image
                          src={image}
                          width={800}
                          height={800}
                          alt={`Image ${index + 1}`}
                          className={styles.feed_gallery_modal_image}
                          priority
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious
                    className={styles.feed_gallery_modal_nav_prev}
                  />
                  <CarouselNext
                    className={styles.feed_gallery_modal_nav_next}
                  />
                </Carousel>
              </div>
              <div className={styles.feed_gallery_modal_counter}>
                {currentSlide} / {images.length}
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className={styles.feed_gallery_modal_post_content}>
              {/* Header */}
              <div className={styles.feed_post_item_header}>
                <div className={styles.feed_post_item_header_left}>
                  <div className={styles.feed_post_item_header_left_img}>
                    <Image
                      src={feed?.author?.logo_url || CompanyDefaultImg}
                      width={50}
                      height={50}
                      alt='profile'
                    />
                  </div>
                  <div className={styles.feed_post_item_header_left_name}>
                    <h4
                      onClick={() =>
                        router.push(`/company/${feed?.author?.id}`)
                      }
                    >
                      {feed?.author?.name}
                    </h4>
                    <p>{getTimeAgo(feed?.created_at || '')}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className={styles.feed_post_item_body_modal}>
                <ReadMoreCaption
                  content={feed.text_content || ''}
                  wordLimit={10}
                />

                {/* Stats row */}
                <div className={styles.feed_post_item_modal_reaction}>
                  <div className={styles.feed_post_item_modal_reaction_left}>
                    {localLikesCount > 0 && (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width={16}
                        height={16}
                        viewBox='0 0 25 25'
                        fill='none'
                        className='mb-[3.5px]'
                      >
                        <path
                          d='M1.5625 13.2813V21.0938C1.5625 22.3859 2.61406 23.4375 3.90625 23.4375H6.25V10.9375H3.90625C2.61406 10.9375 1.5625 11.9891 1.5625 13.2813ZM22.7672 10.6484C22.4784 10.2516 22.0994 9.92919 21.6615 9.70777C21.2235 9.48634 20.7392 9.37228 20.2484 9.37501H14.8844L15.6094 5.75001C15.7111 5.24212 15.6989 4.71798 15.5735 4.21541C15.4481 3.71283 15.2127 3.24435 14.8844 2.84376C14.5569 2.44248 14.144 2.11926 13.6759 1.89762C13.2077 1.67598 12.6961 1.5615 12.1781 1.56251C11.4844 1.56251 10.8672 2.02813 10.6922 2.64532L9.96719 4.65469C9.40092 6.22058 8.67963 7.72597 7.81406 9.14844V23.4375H17.8094C18.476 23.4399 19.1258 23.228 19.6629 22.833C20.2 22.438 20.5959 21.8809 20.7922 21.2438L23.2328 13.4313C23.3814 12.9637 23.4167 12.4675 23.3357 11.9837C23.2547 11.4998 23.0599 11.0422 22.7672 10.6484Z'
                          fill={isLight ? '#356FEE' : '#20BDFF'}
                        />
                      </svg>
                    )}
                    <span
                      className={
                        styles.feed_post_item_body_bottom_area_left_reactions_text
                      }
                    >
                      {localLikesCount > 0 &&
                        `${localLikesCount} ${localLikesCount === 1 ? 'Like' : 'Likes'}`}
                    </span>
                  </div>
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_left_reactions_text
                    }
                  >
                    <span>
                      {localCommentsCount > 0 &&
                        `${localCommentsCount} Comments`}
                      {localCommentsCount > 0 && localSharesCount > 0 && ' | '}
                      {localSharesCount > 0 && `${localSharesCount} Shares`}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className={styles.feed_post_item_body_bottom_area_right}>
                  {/* Like */}
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_right_like
                    }
                    onClick={handleAddReaction}
                    style={{
                      opacity: addReactionMutation.isPending ? 0.5 : 1,
                      pointerEvents: addReactionMutation.isPending
                        ? 'none'
                        : 'auto'
                    }}
                  >
                    <span
                      className={
                        styles.feed_post_item_body_bottom_area_right_like_icon
                      }
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width={20}
                        height={20}
                        viewBox='0 0 25 25'
                        fill='none'
                      >
                        {isLiked ? (
                          <path
                            d='M1.5625 13.2813V21.0938C1.5625 22.3859 2.61406 23.4375 3.90625 23.4375H6.25V10.9375H3.90625C2.61406 10.9375 1.5625 11.9891 1.5625 13.2813ZM22.7672 10.6484C22.4784 10.2516 22.0994 9.92919 21.6615 9.70777C21.2235 9.48634 20.7392 9.37228 20.2484 9.37501H14.8844L15.6094 5.75001C15.7111 5.24212 15.6989 4.71798 15.5735 4.21541C15.4481 3.71283 15.2127 3.24435 14.8844 2.84376C14.5569 2.44248 14.144 2.11926 13.6759 1.89762C13.2077 1.67598 12.6961 1.5615 12.1781 1.56251C11.4844 1.56251 10.8672 2.02813 10.6922 2.64532L9.96719 4.65469C9.40092 6.22058 8.67963 7.72597 7.81406 9.14844V23.4375H17.8094C18.476 23.4399 19.1258 23.228 19.6629 22.833C20.2 22.438 20.5959 21.8809 20.7922 21.2438L23.2328 13.4313C23.3814 12.9637 23.4167 12.4675 23.3357 11.9837C23.2547 11.4998 23.0599 11.0422 22.7672 10.6484Z'
                            fill={isLight ? '#356FEE' : '#20BDFF'}
                          />
                        ) : (
                          <path
                            d='M20.311 9.37499H16.675L17.511 6.59061C17.6854 6.00737 17.7213 5.39145 17.6156 4.79192C17.51 4.19238 17.2658 3.62581 16.9025 3.13732C16.5392 2.64883 16.0669 2.25194 15.5231 1.97826C14.9793 1.70457 14.3791 1.56167 13.7703 1.56092C13.4786 1.55991 13.1924 1.6406 12.9441 1.79387C12.6959 1.94713 12.4955 2.16683 12.3656 2.42811L9.1094 8.94061C9.04445 9.07022 8.94473 9.17919 8.82138 9.25535C8.69803 9.33152 8.55593 9.37186 8.41096 9.37186H4.68909C2.96565 9.37186 1.56409 10.7734 1.56409 12.4969V20.3094C1.56409 22.0328 2.96565 23.4344 4.68909 23.4344H17.4422C19.886 23.4344 20.7547 21.5562 21.1953 20.1453L23.2938 13.4312C23.3896 13.125 23.4375 12.8125 23.4375 12.4937C23.4367 11.6652 23.1069 10.8709 22.5206 10.2855C21.9343 9.70007 21.1395 9.37145 20.311 9.37186V9.37499ZM3.12502 20.3125V12.5C3.12502 11.639 3.82659 10.9375 4.68752 10.9375H6.25002V21.875H4.68752C3.82659 21.875 3.12502 21.1734 3.12502 20.3125ZM21.8031 12.9656L19.7047 19.6812C19.136 21.5015 18.3891 21.8734 17.4422 21.8734H7.81409V10.9359H8.41096C9.30471 10.9359 10.1078 10.439 10.5078 9.64061L13.7641 3.12811L13.7703 3.12498C14.1358 3.12509 14.4961 3.21066 14.8226 3.37485C15.1491 3.53903 15.4327 3.77729 15.6507 4.0706C15.8687 4.3639 16.0151 4.70412 16.0782 5.06408C16.1413 5.42404 16.1193 5.79377 16.0141 6.14373L14.8766 9.9328C14.8415 10.0495 14.8342 10.1728 14.8552 10.2928C14.8763 10.4128 14.9251 10.5263 14.9979 10.6241C15.0706 10.7218 15.1652 10.8012 15.2741 10.8559C15.383 10.9106 15.5032 10.9391 15.625 10.939H20.311C20.5562 10.9389 20.7981 10.9964 21.017 11.1071C21.236 11.2178 21.4257 11.3784 21.571 11.576C21.7163 11.7737 21.813 12.0027 21.8534 12.2447C21.8937 12.4866 21.8765 12.7347 21.8031 12.9687V12.9656Z'
                            fill={isLight ? '#888888' : '#E3E3E3'}
                          />
                        )}
                      </svg>
                    </span>
                  </div>

                  {/* Comment icon (decorative) */}
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_right_comment
                    }
                  >
                    <span
                      className={
                        styles.feed_post_item_body_bottom_area_right_like_icon
                      }
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        xmlnsXlink='http://www.w3.org/1999/xlink'
                        width={19}
                        height={19}
                        viewBox='0 0 20 20'
                        fill='none'
                      >
                        <mask
                          id='mask0_gallery_comment'
                          style={{ maskType: 'alpha' }}
                          maskUnits='userSpaceOnUse'
                          x={0}
                          y={0}
                          width={20}
                          height={20}
                        >
                          <rect
                            width={20}
                            height={20}
                            fill='url(#pattern_gallery_comment)'
                          />
                        </mask>
                        <g mask='url(#mask0_gallery_comment)'>
                          <rect y='0.5' width={20} height={19} fill={feed.activity?.is_comment ? (isLight ? '#356FEE' : '#20BDFF') : isLight ? '#888888' : '#E3E3E3'} />
                        </g>
                        <defs>
                          <pattern
                            id='pattern_gallery_comment'
                            patternContentUnits='objectBoundingBox'
                            width={1}
                            height={1}
                          >
                            <use
                              xlinkHref='#img_gallery_comment'
                              transform='scale(0.01)'
                            />
                          </pattern>
                          <image
                            id='img_gallery_comment'
                            width={100}
                            height={100}
                            preserveAspectRatio='none'
                            xlinkHref='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAHrUlEQVR4nO2de7BVUxjAf70p0Qu9PNKtSCpUJhHGoNAwwh8I41keE4OoqUTkUXkbpDzKkMeYFBkzxQylhwhRE3rQ7UU1SvS895plvjP2fLPPPeucvfc9e5+9fjNrprndtda3vnX3enzrW98Ch8PhcDgcDkc6qQd0AvoDtwATgOnAbOBTYAmwXNIS+dls+Z0Jkqcf0FHKcuRJK2CgKHMesAuoCintkjJN2ZdIXQ4fjgGGirIqQ+wAm/QjMAboTMppBtwtQ02hyvwH2AaslrRNfhakc+4CmpIiegCvWCpuH/AN8BJwD3ApcBLQ3KKe5vK7Js8wKWOplGnT0VMkf8lyIvBRDkVUAPOB4UBfoFEEcpgyzwBGAF9KndXJNAvoRgnRUVY82eYG8/M5wM1AyyLI1xoYDMytRkbTaW8CZSQYs8S8F9idpZF/yjASp8m0DHgU2JJF5r3y//VJGKcAy7I0agNwK3Ag8aUhcDuwMUsbvpO5MPbUliXkfp9GbJUvxjQ2KTSS+WybT3tMG0cBtYgpTYAPs8wRUxK+lGwGvJZljpkJHELM6AL87CPsL8DZlA7nyH5Ht/Mn4HhiNF/4fdJTEzY85TOMvZFlSO5FkTF7he0+mzkzV5Q6NwF7VNt3FnNEONdnt22Wi31ID6fJl+HVwd/F6JQuso/wCrIJ6Er6OA5Yr3SxoyZ392Zn+5sSYC3QgfTSDlildFIOtI264oZioNNfhhEo7bQHfle6+TrqDfALPlbR3lFWmDB6yhzi1dEzUVV2gdoYGYPbxVFVlmAGKj2Zf58XdiWHydDk7fnxYVdSQjzhY7+zOcOxZoqqwBgODwizghKjgRggvTp7MazCuypj4a44mQlizAnq6GF/WHr7RPX0uDAKTQmPK90Z96RAnKUK3AwcHI6sqaAJ8IfSoTk+LpgPVGFDwpM1NdymdPh+oQUdreaODQGPLs8H1mQ5gYtzWiNek4VSX61QjU6PLKSg8Uqw0QRDm1uSlMoDtv1BVd4jhRzFes+T94TgEbIuBoqtKjAZ2YPQRhwkMuWtz/fot6cS6D2C0z/LaVvc02px1g6Kno/zcsJ7QGW+OgSB0s71Sqf355N5ibJZHRqdnKmhpfKSXJyPid27uloQrZypYpFHr/ttzU96/ngqejlTw7OFzCPXqUxm7HOE5xjh1e01NpkmqkzGzccRDr0LOcKYrjIl2eMwbjRXujUe9Tn5WJ12mU2iIxzqqNNEK+vvfE8G4wSXVFvVGksbVFC587V17fDkNXcqc/KDJ4OxPyXZVlVeQ3KXF2hCMrrOyQrV+7a4DrGjXB2F58Trd2XMxkm1Va22tEEFlTtfW1feQ9YXyu/KEd2kbi7B5uQd9RdgLqs4irjsfVJl6h6SMA44tZCN4RCV6cro5UwNg5VuB9neeci7Fx1WPFeIcfEgddy40K4uhwWL1U0za+/PhSpj7G6ZJpBW6oDKnI1Y87D6tK6NTs7UcIPSqbnjbk0vldnEIglK3GxdVTXkl5VhpirXBOOxppYyKVSIK0sQvCaDtLkBtVVhodYVEgFCO3eZmFNBSLNf1kOqPDMlBHYl3RgwEEDcbF1VNeSX1UCc1DPlmS/liEILm6qEM1HdHPkxVOnwXQLQQY19xrXeXUewp6lP7C0T/SIQr6oCxwYtMEVMVLoz0ZJCuX/t3bmbf58cRsElTjcVC2WfRH0IhTGqp5fHPCJcsTET+fdKZ8+HHT/xW1WBufrr8OdppavyKM6Vuquhy2wWLwu7khLgcp/AASbwWSSMUj1vrkifHlVlCaSPT6z6SH2ja8vlHW+FW8OcrBJMB58bt1/VRICFhsqunwnPZFZjaaWTj2lobU0GhjYV/aoE2JLSyECdfQKYbS9GMLfOclXaK8hfEvovLfT1CfG3UwIuFIX2PgbDvSkJMHCHWnVmvgzjk1BU2si7G9pKOgNoQenR2OfKRmbIjk348RbK4zGTNkS5Bi8C/WSy1u1cGbNHBf6jLvCYTzjuSlv/oxhj/uCmZTkvmRF3J5ALfSY66yvAMcO4RI30CYmbMRaOiHMwfi/tlPALE9gRd/pEGc2kpUl7Dqm1aoBx4E4Cx0oUUb8vImMqGi7Dc6IYoBpiQnXElbbywMxnOZ48mibP+yUS7WhnQszmG8q8V0R2oMYSm320zG253k2cIfIkGm9Ezv15ngWMVZtME3dlkrx5OECUc3iO28G1JLRtDzGH3we8LHL5vf5T5bPbnlQqr7OVqcaZa9Y21PIJmlZdqpB3SzZL3PXMw5LZHiGzSctkB25iJZYM2insCksL8vQAiiw0VchbhsNK9TGBeioS3XYL57pOWV50mwW8LWYZm9c5bZKJy/65PH13kQxrJc0gpQBzQSUbdeUv0+8J1tfVHFFfjpCvEhfXydJhC2SOWel5vnuOuNu8JXFzB4sFuixtz3fXk0fAMkrdXc37Gf19nCaqPJ1hbqs6AnJjDreXOrL8nZelIyrj/i5g0lwmN/l8HXXExDAux3WETXJ/xBESk5WCV8k4ns0E4U3GacLFdAyRMy12u35pURiOx47q42vZrPtny5LTzRVF6pBKMVcbA+NRUQnh+J8y6ZQVsg+YKw/5jpTDqpLffDkcDofD4XA4iDn/Aq3pXnml+jd7AAAAAElFTkSuQmCC'
                          />
                        </defs>
                      </svg>
                    </span>
                  </div>

                  {/* Repost */}
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_right_like
                    }
                    onClick={handleRepost}
                    style={{
                      opacity: repostMutation.isPending ? 0.5 : 1,
                      pointerEvents: repostMutation.isPending ? 'none' : 'auto'
                    }}
                  >
                    <span
                      className={
                        styles.feed_post_item_body_bottom_area_right_like_icon
                      }
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width={20}
                        height={20}
                        viewBox='0 0 24 24'
                      >
                        <g
                          fill='none'
                          stroke={isShared ? (isLight ? '#356FEE' : '#20BDFF') : isLight ? '#888888' : '#E3E3E3'}
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='1.5'
                        >
                          <path d='M8.5 15S5 17.578 5 18.5S8.5 22 8.5 22' />
                          <path d='M5.5 18.5h8c3.288 0 4.931 0 6.038-.908q.304-.25.554-.554C21 15.93 21 14.288 21 11m-5.5-2S19 6.422 19 5.5S15.5 2 15.5 2' />
                          <path d='M18.5 5.5h-8c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C3 8.07 3 9.712 3 13' />
                        </g>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* ── Comments section ── */}
                <div
                  className={
                    styles.feed_post_item_body_bottom_area_right_comment_list_main
                  }
                >
                  {/* Comment input */}
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_right_comment_list_comment_area
                    }
                  >
                    <div
                      className={
                        styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_Profile
                      }
                    >
                      <Avatar
                        imageUrl={loggedInUser?.profile_image_url || null}
                        firstName={loggedInUser?.first_name}
                        lastName={loggedInUser?.last_name}
                        size={40}
                        className='w-full h-full object-cover cursor-pointer'
                        onClick={() =>
                          router.push(`/profile/${loggedInUser?.id}`)
                        }
                      />
                    </div>
                    <div
                      className={`${styles.comment_input_wrapper} ${styles.comment_input_wrapper_feed_modal}`}
                    >
                      <textarea
                        placeholder='Write a comment...'
                        value={commentInput}
                        onChange={e => {
                          setCommentInput(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 100) + 'px'
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment()
                          }
                        }}
                        className={styles.comment_textarea}
                        rows={1}
                        maxLength={500}
                        data-feed-id={feedId}
                      />
                      <div className={styles.comment_panel_media_upload_icon}>
                        <span
                          className={
                            styles.comment_panel_media_upload_icon_modal
                          }
                        >
                          <Image
                            src={MediaUpload}
                            alt='Media Upload'
                            width={20}
                            height={20}
                            onClick={() => fileInputRef.current?.click()}
                            style={{ cursor: 'pointer' }}
                          />
                          <input
                            type='file'
                            accept='image/*'
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileSelected}
                          />
                        </span>
                        <button
                          onClick={handleAddComment}
                          className={styles.comment_panel_sendComment}
                          disabled={
                            (!commentInput.trim() && !selectedFile) ||
                            addCommentMutation.isPending
                          }
                          style={{
                            opacity:
                              (!commentInput.trim() && !selectedFile) ||
                              addCommentMutation.isPending
                                ? 0.4
                                : 1,
                            cursor:
                              (!commentInput.trim() && !selectedFile) ||
                              addCommentMutation.isPending
                                ? 'not-allowed'
                                : 'pointer'
                          }}
                        >
                          {addCommentMutation.isPending ? (
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='24'
                              height='24'
                              viewBox='0 0 24 24'
                              style={{
                                animation: 'commentSendSpin 1s linear infinite',
                                transformOrigin: 'center',
                              }}
                              aria-label='Sending comment'
                            >
                              <path
                                fill='none'
                                stroke={isLight ? '#356FEE' : '#FFFFFF'}
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 6V3m4.25 4.75L18.4 5.6M18 12h3m-4.75 4.25l2.15 2.15M12 18v3m-4.25-4.75L5.6 18.4M6 12H3m4.75-4.25L5.6 5.6'
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='24'
                              height='24'
                              viewBox='0 0 24 24'
                            >
                              <path
                                fill='#20BDFF'
                                d='M20.04 2.323c1.016-.355 1.992.621 1.637 1.637l-5.925 16.93c-.385 1.098-1.915 1.16-2.387.097l-2.859-6.432l4.024-4.025a.75.75 0 0 0-1.06-1.06l-4.025 4.024l-6.432-2.859c-1.063-.473-1-2.002.097-2.387z'
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {filePreview && (
                        <div className='w-full'>
                          <div className='relative inline-block mb-4 mt-2 mx-4'>
                            <Image
                              src={filePreview}
                              alt='Upload preview'
                              width={100}
                              height={100}
                              className='rounded-lg object-cover max-h-[100px]'
                            />
                            <button
                              onClick={handleRemoveImage}
                              style={{
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                backgroundColor: isLight ? 'rgba(0,0,0,0.6)' : '#000000bf',
                                borderRadius: '50%',
                                color: '#fff'
                              }}
                              aria-label='Remove image'
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments list */}
                  <div
                    className={
                      styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom
                    }
                  >
                    <p className={isLight ? 'text-[#888888]' : undefined}>
                      Most relevent comments ({localCommentsCount})
                    </p>
                    <div
                      className={`${styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items} hide-scrollbar`}
                    >
                      {commentsLoading ? (
                        <p className={`text-sm ${isLight ? 'text-[#888888]' : 'text-[#FFF]'}`}>
                          Loading comments...
                        </p>
                      ) : commentsIsError ? (
                        <p className={`text-sm ${isLight ? 'text-red-600' : 'text-[#FFF]'}`}>
                          {(commentsError as any)?.message ??
                            'Failed to fetch comments'}
                        </p>
                      ) : allComments.length > 0 ? (
                        allComments.map((comment: any, index: number) => (
                          <div
                            key={
                              comment.id ||
                              comment._id ||
                              comment._tempId ||
                              index
                            }
                            className={
                              styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item
                            }
                            // Fade optimistic comments slightly so the user knows they're pending
                            style={{
                              opacity: comment._optimistic ? 0.6 : 1,
                              transition: 'opacity 0.2s'
                            }}
                          >
                            <div
                              className={
                                styles.feed_post_comment_area_header_area
                              }
                            >
                              <Avatar
                                imageUrl={
                                  comment.author?.profile_image_url || null
                                }
                                firstName={
                                  comment.author?.first_name?.split(' ')[0]
                                }
                                lastName={
                                  comment.author?.last_name ||
                                  comment.author?.first_name
                                    ?.split(' ')
                                    .slice(1)
                                    .join(' ')
                                }
                                size={32}
                                className='comment-avatar-image shrink-0'
                                onClick={() => {
                                  const path =
                                    comment.author?.id === loggedInUser?.id
                                      ? `/profile/${loggedInUser?.id}`
                                      : `/user/${comment.author?.id}`
                                  router.push(path)
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  className={
                                    styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_profile_name_first_name
                                  }
                                  style={{
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    ...(isLight ? { color: '#3960FB' } : {})
                                  }}
                                  onClick={() => {
                                    const path =
                                      comment.author?.id === loggedInUser?.id
                                        ? `/profile/${loggedInUser?.id}`
                                        : `/user/${comment.author?.id}`
                                    router.push(path)
                                  }}
                                >
                                  {comment.author?.first_name}{' '}
                                  {comment.author?.last_name}
                                </div>
                              </div>

                              <div
                                className={
                                  styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_time_container
                                }
                              >
                                <span
                                  className={
                                    styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_time
                                  }
                                  style={{
                                    ...(isLight ? { color: '#888888' } : {})
                                  }}
                                >
                                  {getCompactTimeAgo(comment.created_at || '')}
                                </span>
                                {!comment._optimistic && (
                                  <div
                                    style={{ position: 'relative' }}
                                    data-comment-menu
                                  >
                                    <span
                                      className={styles.threedot}
                                      style={{
                                        cursor: 'pointer',
                                        ...(isLight ? { color: '#040F1F' } : {})
                                      }}
                                      onClick={() =>
                                        setCommentMenuOpen(
                                          commentMenuOpen ===
                                            (comment.id || comment._id)
                                            ? null
                                            : comment.id || comment._id
                                        )
                                      }
                                    >
                                      <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        width={16}
                                        height={16}
                                        viewBox='0 0 256 256'
                                      >
                                        <path
                                          fill={isLight ? '#888888' : '#a0aec0'}
                                          d='M156 128a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-28-52a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0 104a28 28 0 1 0 28 28a28 28 0 0 0-28-28'
                                        />
                                      </svg>
                                    </span>
                                    {commentMenuOpen ===
                                      (comment.id || comment._id) && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 'calc(100% + 8px)',
                                          right: 0,
                                          zIndex: 10,
                                          background: isLight
                                            ? '#fff'
                                            : 'linear-gradient(#040f1f, #040f1f) padding-box padding-box, linear-gradient(91.13deg, #5433ff 2.22%, #20bdff 97.08%) border-box',
                                          border: isLight ? '1px solid #ef4444' : '1px solid #0000',
                                          borderRadius: '6px',
                                          boxShadow: isLight
                                            ? '0 4px 12px rgba(0,0,0,0.1)'
                                            : '0 4px 12px rgba(0,0,0,0.3)',
                                          minWidth: '120px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {comment.author?.id === loggedInUser?.id ? (
                                          <div
                                            onClick={() => {
                                              setCommentMenuOpen(null)
                                              setDeleteConfirmModal({
                                                commentId:
                                                  comment.id || comment._id
                                              })
                                            }}
                                            style={{
                                              padding: '8px 16px',
                                              cursor: 'pointer',
                                              color: '#ef4444',
                                              fontSize: '14px',
                                              fontWeight: '600',
                                              transition: 'background-color 0.15s',
                                              display: 'flex',
                                              justifyContent: 'start',
                                              alignItems: 'center',
                                              gap: '6px'
                                            }}
                                            onMouseEnter={e =>
                                              (e.currentTarget.style.backgroundColor =
                                                isLight ? '#FEF2F2' : '#2a2a2a')
                                            }
                                            onMouseLeave={e =>
                                              (e.currentTarget.style.backgroundColor =
                                                'transparent')
                                            }
                                          >
                                            <Trash2 size={14} color="#ef4444" className="h-4 w-4" />
                                            <span>Remove</span>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => {
                                              setCommentMenuOpen(null)
                                              ensureAuthed('report this', () =>
                                                setReportDialog({
                                                  type: 'comment',
                                                  id: comment.id || comment._id
                                                })
                                              )
                                            }}
                                            style={{
                                              padding: '8px 16px',
                                              cursor: 'pointer',
                                              color: '#ef4444',
                                              fontSize: '14px',
                                              fontWeight: '600',
                                              transition: 'background-color 0.15s',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px'
                                            }}
                                            onMouseEnter={e =>
                                              (e.currentTarget.style.backgroundColor =
                                                isLight ? '#FEF2F2' : '#2a2a2a')
                                            }
                                            onMouseLeave={e =>
                                              (e.currentTarget.style.backgroundColor =
                                                'transparent')
                                            }
                                          >
                                            <svg xmlns='http://www.w3.org/2000/svg' width={14} height={14} viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round'>
                                              <path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' />
                                              <line x1='4' y1='22' x2='4' y2='15' />
                                            </svg>
                                            <span>Report</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              className={
                                styles.feed_post_comment_area_body_area
                              }
                            >
                              {comment?.comment_media_urls ? (
                                <>
                                  {Array.isArray(comment.comment_media_urls) ? (
                                    comment.comment_media_urls.map(
                                      (url: string, i: number) => (
                                        <div
                                          key={i}
                                          style={{
                                            marginTop: '8px',
                                            marginBottom: '8px',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                          }}
                                        >
                                          <Image
                                            src={url}
                                            alt={`Comment Media ${i + 1}`}
                                            width={200}
                                            height={200}
                                            className={
                                              styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_comment_media
                                            }
                                            style={{
                                              maxWidth: '200px',
                                              maxHeight: '200px',
                                              objectFit: 'cover',
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              marginBottom: '10px'
                                            }}
                                            onClick={() =>
                                              setFullscreenCommentImage(url)
                                            }
                                          />
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <div
                                      style={{
                                        marginTop: '8px',
                                        marginBottom: '8px',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Image
                                        src={
                                          comment.comment_media_urls as string
                                        }
                                        alt='Comment Media'
                                        width={200}
                                        height={200}
                                        className={
                                          styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_comment_media
                                        }
                                        style={{
                                          maxWidth: '160px',
                                          maxHeight: '160px',
                                          objectFit: 'cover',
                                          cursor: 'pointer',
                                          borderRadius: '4px'
                                        }}
                                        onClick={() =>
                                          setFullscreenCommentImage(
                                            comment.comment_media_urls as string
                                          )
                                        }
                                      />
                                    </div>
                                  )}
                                </>
                              ) : null}
                              <div
                                style={{ marginTop: '10px' }}
                                className={styles.feed_comment}
                              >
                                {comment.comment_text}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={`text-sm ${isLight ? 'text-[#888888]' : 'text-[#FFF]'}`}>No comments</p>
                      )}
                    </div>

                    {/* Load more */}
                    {hasNextPage && (
                      <div
                        className='cursor-pointer text-grey-500 hover:text-grey-700 text-sm font-medium'
                        onClick={() => fetchNextPage()}
                        style={{
                          opacity: isFetchingNextPage ? 0.5 : 1,
                          pointerEvents: isFetchingNextPage ? 'none' : 'auto'
                        }}
                      >
                        <div className='load-more'>
                          {isFetchingNextPage ? (
                            <div className='w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10' />
                          ) : (
                            'Load more comments...'
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen comment image */}
      {fullscreenCommentImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'pointer'
          }}
          onClick={() => setFullscreenCommentImage(null)}
        >
          <button
            onClick={e => {
              e.stopPropagation()
              setFullscreenCommentImage(null)
            }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              color: 'white',
              background: 'none',
              border: 'none',
              fontSize: 32,
              cursor: 'pointer',
              zIndex: 10001
            }}
          >
            &times;
          </button>
          <img
            src={fullscreenCommentImage}
            alt='Full screen'
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain'
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Undo Repost confirm modal */}
      {/* {unrepostConfirmModal && (
        <div
          className='fixed inset-0 flex items-center justify-center'
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10002 }}
          onClick={() => setUnrepostConfirmModal(false)}
        >
          <div
            className='relative rounded-2xl p-6 max-w-sm w-full mx-4'
            style={{
              // background: 'linear-gradient(160deg, #1e1e24 0%, #18181f 100%)',
              background:' #040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setUnrepostConfirmModal(false)}
              className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors'
            >
              <X className='w-5 h-5 cursor-pointer' />
            </button>
            
            <h2 className='text-white text-lg font-semibold text-center mb-2'>
              Remove Repost
            </h2>
            <p className='text-gray-400 text-sm text-center mb-6'>
              Are you sure you want to remove this repost ?
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setUnrepostConfirmModal(false)}
                className='flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-colors'
                    style={{
                    background: '#20bdff1a',
                    border: '1px solid #20bdff',
                    color: '#20bdff',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    height: '36px',
                    width: '120px',
                    fontSize: '12px',
                  }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUndoRepost()
                  setUnrepostConfirmModal(false)
                }}
                disabled={repostMutation.isPending}
                className='flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors btn-gradient'
                 style={{
                    height: '36px',
                    width: '120px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
              >
                {repostMutation.isPending ? 'Removing...' : 'Remove Repost'}
              </button>
            </div>
          </div>
        </div>
      )} */}

      <ConfirmModal
              isOpen={!!unrepostConfirmModal}
              onClose={() => setUnrepostConfirmModal(false)}
              onConfirm={() => {
                handleUndoRepost()
                  setUnrepostConfirmModal(false)
              }}
              title='Remove Repost'
              message='Are you sure you want to remove this repost?'
              confirmText='Remove'
              cancelText='Cancel'
              isLoading={repostMutation.isPending === true}
              loadingText='Removing...'
            />



      {/* Delete confirm modal */}
      {/* {deleteConfirmModal && (
        <div
          className='fixed inset-0 flex items-center justify-center'
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10002 }}
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div
            className='relative rounded-2xl p-6 max-w-sm w-full mx-4'
            style={{
              // background: 'linear-gradient(160deg, #1e1e24 0%, #18181f 100%)',
              background:' #040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setDeleteConfirmModal(null)}
              className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors'
            >
              <X className='w-5 h-5 cursor-pointer' />
            </button>
            <div className='flex justify-center mb-4'>
              
            </div>
            <h2 className='text-white text-lg font-semibold text-center mb-2'>
              Delete Comment
            </h2>
            <p className='text-gray-400 text-sm text-center mb-6'>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className='flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-colors'
                style={{
                    background: '#20bdff1a',
                    border: '1px solid #20bdff',
                    color: '#20bdff',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    height: '36px',
                    width: '120px',
                    fontSize: '12px',
                  }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmModal) {
                    handleDeleteComment(deleteConfirmModal.commentId)
                    setDeleteConfirmModal(null)
                  }
                }}
                disabled={deleteCommentMutation.isPending}
                className='flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors btn-gradient'
                 style={{
                    height: '36px',
                    width: '120px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
              >
                {deleteCommentMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )} */}

      <ConfirmModal
              isOpen={!!deleteConfirmModal}
              onClose={() => setDeleteConfirmModal(null)}
              onConfirm={() => {
                 if (deleteConfirmModal) {
                    handleDeleteComment(deleteConfirmModal.commentId)
                    setDeleteConfirmModal(null)
                  }
              }}
              title='Remove Comment'
              message='Are you sure you want to remove this comment?'
              confirmText='Remove'
              cancelText='Cancel'
              isLoading={deleteCommentMutation.isPending}
              loadingText='Removing...'
            />
      <ReportDialog
        open={!!reportDialog}
        onClose={() => setReportDialog(null)}
        reportedType={reportDialog?.type ?? 'comment'}
        reportedId={reportDialog?.id ?? ''}
      />
      {authGateModal}
    </div>
  )
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function getGridStyle (imageCount: number): React.CSSProperties {
  if (imageCount === 1)
    return {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridAutoRows: '300px',
      gap: '8px'
    }
  return {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridAutoRows: '200px',
    gap: '8px'
  }
}

function getImageItemStyle (
  imageCount: number,
  index: number
): React.CSSProperties {
  if (imageCount === 3 && index === 0)
    return { gridColumn: '1 / -1', position: 'relative' }
  return { position: 'relative' }
}

export default FeedGallery