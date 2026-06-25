import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import styles from "@/moduleCss/feeds.module.css";
import stylesheet from "@/_assets/style/style.module.css";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import FeedIcon from "@/_assets/icons/header_icons/feed.svg";
import {
  fetchFeeds,
  FeedsPayload,
  ReactionPayload,
  addReaction,
  repost,
  fetchComments,
  addComment,
} from "@/services/feeds.services";
import FeedGallery from "./FeedGallery";
import ReadMoreCaption from "./ReadMoreCaption";
import Tooltip from "@mui/material/Tooltip";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { GlobalSpinner } from "../commonUI/loaders/spinners/GlobalSpinner";
import Like from "@/../public/images/Like.svg";
import ReactionPopup from "./ReactionPopup";
import MediaUpload from "@/../public/images/media_upload.svg";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import UserDefaultImg from "../../../public/profile/default_user_icon.png";
import CompanyDefaultImg from "../../../public/images/company-logo-default.svg";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ensureValidToken } from "@/lib/tokenManager";
import {
  useAddReaction,
  useRepost,
  useAddComment,
  useFetchComments,
  useDeleteComment,
} from "@/app/hooks/feedMutations";
import { FeedPostSkeleton } from "../commonUI/loaders/skeletons/FeedPostSkeleton";
import Avatar from "../commonUI/Avatar";
import { id } from "date-fns/locale";
import RepostSharedListModal from "../commonUI/RepostSharedListModal";
import ConfirmModal from "../commonUI/ConfirmModal";
import ReportDialog from "../moderation/ReportDialog";
import { ReportedType } from "@/services/moderation.services";
import { useAuthGate } from "@/app/hooks/useAuthGate";

interface FeedFilters {
  search_text?: string;
  [key: string]: any;
}

const FeedPostComponent = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sharedListModal, setSharedListModal] = useState<{
    feedId: string;
    sharedList: any[];
  } | null>(null);

  // Add near your other state declarations
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    commentId: string;
    feedId: string;
  } | null>(null);

  // Add near your other state declarations
  const [unrepostConfirmModal, setUnrepostConfirmModal] = useState<{
    feedId: string;
  } | null>(null);

  // Search state
  const [displaySearchInput, setDisplaySearchInput] = useState("");
  const [serverSearchInput, setServerSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  // Reaction popup state
  const [showReactionPopup, setShowReactionPopup] = useState<string | null>(
    null,
  );
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showCommentPopup, setShowCommentPopup] = useState<string | null>(null);
  const [openCommentSections, setOpenCommentSections] = useState<Set<string>>(
    new Set(),
  );
  const [commentsByFeedId, setCommentsByFeedId] = useState<
    Record<
      string,
      {
        items: any[];
        loading: boolean;
        error?: string;
        currentPage?: number;
        hasMore?: boolean;
      }
    >
  >({});
  const [commentPageByFeedId, setCommentPageByFeedId] = useState<
    Record<string, number>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [commentImages, setCommentImages] = useState<
    Record<string, File | null>
  >({});
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [repostLoadingId, setRepostLoadingId] = useState<string | null>(null);
  const [commentLoadingId, setCommentLoadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [fullscreenCommentImage, setFullscreenCommentImage] = useState<
    string | null
  >(null);

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate();

  const addReactionMutation = useAddReaction();
  const repostMutation = useRepost();
  const addCommentMutation = useAddComment();
  const fetchCommentsMutation = useFetchComments();
  const deleteCommentMutation = useDeleteComment();
  const user = userProfile?.data;
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [reportDialog, setReportDialog] = useState<{
    type: ReportedType;
    id: string;
  } | null>(null);
  // useInfiniteQuery hook for feeds
  const {
    data: feedsData,
    isLoading: feedsLoading,
    error: feedsError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["feeds", serverSearchInput],
    queryFn: ({ pageParam = 1 }) => {
      const payload: FeedsPayload = {
        limit: 10,
        page: pageParam,
        ...(serverSearchInput && { search_text: serverSearchInput }),
      };
      console.log("Fetching feeds with payload:", payload);
      return fetchFeeds(payload);
    },

    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalCount = lastPage?.total_count || 0;
      const totalPages = Math.ceil(totalCount / 10);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    // Reset pages when search input changes
    getPreviousPageParam: (
      firstPage,
      allPages,
      firstPageParam,
      allPageParams,
    ) => {
      return undefined;
    },
  });

  console.log("Feeds data:", feedsData?.pages);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDisplaySearchInput(value);

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only trigger search if more than 2 characters
      if (value.length >= 2) {
        setIsSearching(true);

        // Set debounce timer for 500ms
        debounceTimerRef.current = setTimeout(() => {
          // Reset the query cache when search changes to get fresh results
          queryClient.removeQueries({ queryKey: ["feeds", serverSearchInput] });
          setServerSearchInput(value);
          setIsSearching(false);
        }, 500);
      } else {
        // Reset search if less than or equal to 2 characters
        if (value.length === 0) {
          // Clear search results and reset to initial state
          queryClient.removeQueries({ queryKey: ["feeds", serverSearchInput] });
          setServerSearchInput("");
          setIsSearching(false);
        }
      }
    },
    [queryClient, serverSearchInput],
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    // Clear search results and reset to initial state
    queryClient.removeQueries({ queryKey: ["feeds", serverSearchInput] });
    setDisplaySearchInput("");
    setServerSearchInput("");
    setIsSearching(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [queryClient, serverSearchInput]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ESC key listener for fullscreen comment image
  useEffect(() => {
    if (!fullscreenCommentImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenCommentImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenCommentImage]);

  // Flatten all feeds from paginated data
  const allFeeds = feedsData?.pages.flatMap((page) => page?.data?.result) || [];

  console.log(allFeeds, "all feed posts");

  // NOTE: the feedsError early-return is intentionally rendered just before the
  // main return (after ALL hooks) so a conditional return never changes the
  // hook call order (was causing "Rendered fewer hooks than expected").

  const getTimeAgo = (date: string) => {
    const now = Date.now();
    const past = new Date(date).getTime();
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return "now";
    }

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
      return "1d ago";
    }
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (days < 30) {
      return weeks === 1 ? "1w ago" : `${weeks}w ago`;
    }

    const months = Math.floor(days / 30);
    if (months === 1) {
      return "1mo ago";
    }
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(months / 12);
    if (years === 1) {
      return "1y ago";
    }

    return `${years}y ago`;
  };

  const getCompactTimeAgo = (date: string) => {
    const now = Date.now();
    const past = new Date(date).getTime();
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return "now";
    }

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}w`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo`;
    }

    const years = Math.floor(months / 12);
    return `${years}y`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission is handled by the debounce mechanism
  };
  const handleAddReaction = async (payload: ReactionPayload) => {
    ensureAuthed("like this post", async () => {
    if (likeLoadingId === payload.id) return;
    setLikeLoadingId(payload.id);
    try {
      await ensureValidToken();
      await addReaction(payload);
      // Update local state instead of refetching
      setShowReactionPopup(null);

      // Update the specific feed item in the local state
      if (feedsData?.pages) {
        const updatedPages = feedsData.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            result:
              page.data?.result?.map(
                (feed: {
                  id: string;
                  activity: { is_liked: any };
                  post_counter: { likes_count: string };
                }) => {
                  if (feed.id === payload.id) {
                    const isLikeAction = payload.type === "like";
                    const isAdding = payload.action === "add";

                    // For like actions, update is_liked status
                    const updatedIsLiked = isLikeAction
                      ? isAdding
                      : feed.activity.is_liked;

                    // Update likes count only for like actions
                    let updatedLikesCount = feed.post_counter.likes_count;
                    if (isLikeAction) {
                      if (feed.post_counter.likes_count === "None") {
                        updatedLikesCount = isAdding ? "1" : "0";
                      } else {
                        const currentCount = parseInt(
                          feed.post_counter.likes_count,
                        );
                        updatedLikesCount = isAdding
                          ? (currentCount + 1).toString()
                          : Math.max(0, currentCount - 1).toString();
                      }
                    }

                    return {
                      ...feed,
                      activity: {
                        ...feed.activity,
                        is_liked: updatedIsLiked,
                      },
                      post_counter: {
                        ...feed.post_counter,
                        likes_count: updatedLikesCount,
                      },
                    };
                  }
                  return feed;
                },
              ) || [],
          },
        }));

        // Update the query cache with the new data
        queryClient.setQueryData(["feeds", serverSearchInput], {
          pages: updatedPages,
          pageParams: feedsData.pageParams,
        });
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
    } finally {
      setLikeLoadingId(null);
    }
    });
  };

  // Close comment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (commentMenuOpen && !target.closest("[data-comment-menu]")) {
        setCommentMenuOpen(null);
      }
      if (postMenuOpen && !target.closest("[data-post-menu]")) {
        setPostMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [commentMenuOpen, postMenuOpen]);

  const handleDeleteComment = (commentId: string, feedId: string) => {
    ensureAuthed("delete this comment", () => {
    setCommentMenuOpen(null);
    deleteCommentMutation.mutate(
      { id: commentId, action: "delete", feedId },
      {
        onSuccess: () => {
          // Remove comment from local state
          setCommentsByFeedId((prev: any) => {
            const prevItems = prev[feedId]?.items || [];
            return {
              ...prev,
              [feedId]: {
                ...prev[feedId],
                items: prevItems.filter(
                  (c: any) => (c.id || c._id) !== commentId,
                ),
              },
            };
          });

          // Decrement comment count in feeds cache
          if (feedsData?.pages) {
            const updatedPages = feedsData.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                result:
                  page.data?.result?.map((feed: any) => {
                    if (feed.id === feedId) {
                      const cnt =
                        feed.post_counter.comments_count === "None"
                          ? 0
                          : parseInt(feed.post_counter.comments_count);
                      return {
                        ...feed,
                        post_counter: {
                          ...feed.post_counter,
                          comments_count: Math.max(cnt - 1, 0).toString(),
                        },
                      };
                    }
                    return feed;
                  }) || [],
              },
            }));
            queryClient.setQueryData(["feeds", serverSearchInput], {
              pages: updatedPages,
              pageParams: feedsData.pageParams,
            });
          }
        },
      },
    );
    });
  };

  const toggleCommentSection = async (feedId: string) => {
    setOpenCommentSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(feedId)) {
        newSet.delete(feedId);
      } else {
        newSet.add(feedId);
      }
      return newSet;
    });
    if (!openCommentSections.has(feedId) && !commentsByFeedId[feedId]) {
      setCommentsByFeedId((prev) => ({
        ...prev,
        [feedId]: { items: [], loading: true, currentPage: 0, hasMore: true },
      }));
      try {
        // API now sends recent comments on top — just fetch page 1
        const res = await fetchComments({ id: feedId, limit: 5, page: 1 });

        const items = Array.isArray((res as any)?.data?.result)
          ? (res as any).data.result
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray((res as any)?.result)
              ? (res as any).result
              : Array.isArray(res as any)
                ? (res as any)
                : [];

        // hasMore if we got a full page of results
        const hasMore = items.length === 5;

        setCommentsByFeedId((prev) => ({
          ...prev,
          [feedId]: {
            items,
            loading: false,
            currentPage: 1,
            hasMore,
          },
        }));
        setCommentPageByFeedId((prev) => ({ ...prev, [feedId]: 1 }));
      } catch (error: any) {
        setCommentsByFeedId((prev) => ({
          ...prev,
          [feedId]: {
            items: [],
            loading: false,
            error: error?.message || "Failed to fetch comments",
            currentPage: 0,
            hasMore: false,
          },
        }));
      }
    }
  };

  const handleRepost = async (feedId: string) => {
    ensureAuthed("repost this", async () => {
    console.log("Handling repost:", feedId);

    if (repostLoadingId === feedId) return;
    setRepostLoadingId(feedId);
    try {
      await ensureValidToken();
      // Check if already reposted
      const feedToRepost = feedsData?.pages
        ?.flatMap((page) => page.data?.result || [])
        .find((feed) => feed.id === feedId);

      // Determine action: toggle add/remove based on current is_shared state
      const action = feedToRepost?.activity?.is_shared ? "remove" : "add";

      // Optimistic update
      if (feedsData?.pages) {
        const updatedPages = feedsData.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            result:
              page.data?.result?.map(
                (feed: {
                  id: string;
                  activity: { is_shared: boolean };
                  post_counter: { shares_count: string };
                  shared_list?: any[];
                }) => {
                  if (feed.id === feedId) {
                    const currentCount =
                      feed.post_counter.shares_count === "None"
                        ? 0
                        : parseInt(feed.post_counter.shares_count);
                    const existingSharedList = Array.isArray(feed.shared_list)
                      ? feed.shared_list
                      : [];
                    let nextSharedList = existingSharedList;
                    if (action === "add" && user?.id) {
                      const alreadyIn = existingSharedList.some(
                        (u: any) => u.id === user.id,
                      );
                      if (!alreadyIn) {
                        nextSharedList = [
                          {
                            id: user.id,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            profile_image_url: user.profile_image_url,
                          },
                          ...existingSharedList,
                        ];
                      }
                    } else if (action === "remove" && user?.id) {
                      nextSharedList = existingSharedList.filter(
                        (u: any) => u.id !== user.id,
                      );
                    }
                    return {
                      ...feed,
                      activity: {
                        ...feed.activity,
                        is_shared: action === "add",
                      },
                      post_counter: {
                        ...feed.post_counter,
                        shares_count:
                          action === "add"
                            ? (currentCount + 1).toString()
                            : Math.max(currentCount - 1, 0).toString(),
                      },
                      shared_list: nextSharedList,
                    };
                  }
                  return feed;
                },
              ) || [],
          },
        }));

        queryClient.setQueryData(["feeds", serverSearchInput], {
          pages: updatedPages,
          pageParams: feedsData.pageParams,
        });
      }

      // Call mutation with action
      repostMutation.mutate({ id: feedId, type: "repost", action });
    } catch (error: any) {
      console.error("Error reposting:", error);
    } finally {
      setRepostLoadingId(null);
    }
    });
  };

  const handleReactionHover = (feedId: string, event: React.MouseEvent) => {
    const buttonElement = event.currentTarget as HTMLElement;
    const rect = buttonElement.getBoundingClientRect();

    setPopupPosition({
      top: rect.top - 60, // Position above the button
      left: rect.left - 40, // Center horizontally
    });
    setShowReactionPopup(feedId);
  };

  const handleReactionLeave = () => {
    // Add a small delay to allow clicking on reactions
    setTimeout(() => {
      setShowReactionPopup(null);
    }, 300);
  };

  const handleReactionSelect = (feedId: string, reactionType: string) => {
    ensureAuthed("like this post", () => {
    // Optimistic update
    if (feedsData?.pages) {
      const updatedPages = feedsData.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          result:
            page.data?.result?.map(
              (feed: {
                id: string;
                activity: { is_liked: any };
                post_counter: { likes_count: string };
              }) => {
                if (feed.id === feedId) {
                  const isAdding = true;
                  const updatedLikesCount =
                    feed.post_counter.likes_count === "None"
                      ? "1"
                      : (
                          parseInt(feed.post_counter.likes_count) + 1
                        ).toString();

                  return {
                    ...feed,
                    activity: {
                      ...feed.activity,
                      is_liked: isAdding,
                    },
                    post_counter: {
                      ...feed.post_counter,
                      likes_count: updatedLikesCount,
                    },
                  };
                }
                return feed;
              },
            ) || [],
        },
      }));

      queryClient.setQueryData(["feeds", serverSearchInput], {
        pages: updatedPages,
        pageParams: feedsData.pageParams,
      });
    }

    setShowReactionPopup(null);

    // ✅ Call mutation - error/success handled automatically
    addReactionMutation.mutate({
      id: feedId,
      type: reactionType,
      action: "add",
    });
    });
  };

  const handleCommentInputChange = useCallback(
    (feedId: string, value: string) => {
      setCommentInputs((prev) => ({ ...prev, [feedId]: value }));
    },
    [],
  );

  const handleImageUploadClick = (feedId: string) => {
    fileInputRefs.current[feedId]?.click();
  };

  const handleFileSelected = (
    feedId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] || null;

    // Validate file is an image
    if (file && !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    setCommentImages((prev) => ({ ...prev, [feedId]: file }));
    // toast.success(`Image "${file.name}" selected`)
  };

  const handleRemoveImage = (feedId: string) => {
    setCommentImages((prev) => {
      const { [feedId]: _, ...rest } = prev;
      return rest;
    });
    // Reset the file input
    const inputEl = fileInputRefs.current[feedId];
    if (inputEl) inputEl.value = "";
  };

  const handleSendComment = async (feedId: string) => {
    ensureAuthed("comment on this post", async () => {
    console.log("💬 Handling send comment:", feedId);

    if (commentLoadingId === feedId) return;
    setCommentLoadingId(feedId);
    try {
      await ensureValidToken();
      const text = (commentInputs[feedId] || "").trim();
      const image = commentImages[feedId] || null;

      if (!text && !image) {
        toast.warning("Please enter a comment or media file");
        setCommentLoadingId(null);
        return;
      }

      // ✅ Log what we're sending (for debugging)
      console.log("📤 Comment payload:", {
        feedId,
        textLength: text.length,
        hasImage: !!image,
        imageName: image?.name,
        imageSize: image?.size,
        imageType: image?.type,
      });

      // ✅ CRITICAL FIX: Pass File object directly
      // The service (addComment) will handle FormData conversion
      // This ensures the file is properly included in the API request
      addCommentMutation.mutate(
        {
          id: feedId,
          body: text,
          attachments: image || undefined,
        },
        {
          onSuccess: (data: any) => {
            console.log("✅ Comment sent successfully:", data);
            const newCommentId = data?.data?.data?.result?.[0]?.id;

            // Create new comment item
            const newItem = {
              id: newCommentId,
              author: {
                id: user?.id,
                first_name: user?.first_name,
                last_name: user?.last_name,
                // full_name: user?.full_name,
                about: user?.about,
                profile_image_url: user?.profile_image_url,
              },
              comment_text: text,
              comment_media_urls: image ? [URL.createObjectURL(image)] : [],
              created_at: new Date().toISOString(),
            };

            // Update local comments state
            setCommentsByFeedId((prev: any) => {
              const prevItems = prev[feedId]?.items || [];
              return {
                ...prev,
                [feedId]: {
                  items: [newItem, ...prevItems],
                  loading: false,
                },
              };
            });

            // Update feeds data with comment count
            if (feedsData?.pages) {
              const updatedPages = feedsData.pages.map((page) => ({
                ...page,
                data: {
                  ...page.data,
                  result:
                    page.data?.result?.map(
                      (feed: {
                        id: string;
                        post_counter: { comments_count: string };
                      }) => {
                        if (feed.id === feedId) {
                          const cnt =
                            feed.post_counter.comments_count === "None"
                              ? 0
                              : parseInt(feed.post_counter.comments_count);
                          return {
                            ...feed,
                            post_counter: {
                              ...feed.post_counter,
                              comments_count: (cnt + 1).toString(),
                            },
                          };
                        }
                        return feed;
                      },
                    ) || [],
                },
              }));
              queryClient.setQueryData(["feeds", serverSearchInput], {
                pages: updatedPages,
                pageParams: feedsData.pageParams,
              });
            }

            // Reset form
            setCommentInputs((prev: any) => {
              const { [feedId]: _, ...rest } = prev;
              return rest;
            });
            const textarea = document.querySelector(
              `[data-feed-id="${feedId}"]`,
            ) as HTMLTextAreaElement;
            if (textarea) {
              textarea.style.height = "auto";
            }

            setCommentImages((prev: any) => {
              const { [feedId]: _, ...rest } = prev;
              return rest;
            });

            // Reset file input
            const inputEl = fileInputRefs.current[feedId];
            if (inputEl) inputEl.value = "";

            setCommentLoadingId(null);
          },
          onError: (err: any) => {
            console.error("❌ Comment mutation error:", err);
            toast.error("Failed to send comment");
            setCommentLoadingId(null);
          },
        },
      );
    } catch (error: any) {
      console.error("❌ Error in handleSendComment:", error);
      toast.error("Failed to send comment");
      setCommentLoadingId(null);
    }
    });
  };

  // const loadMoreComments = async (feedId: string) => {
  //   if (loadingMore) return;
  //   setLoadingMore(true);
  //   const currentPage = commentPageByFeedId[feedId] || 1
  //   const nextPage = currentPage + 1

  //   setCommentsByFeedId((prev: any) => ({
  //     ...prev,
  //     [feedId]: { ...prev[feedId], loading: true }
  //   }))

  //   fetchCommentsMutation.mutate(
  //     { id: feedId, limit: 5, page: nextPage },
  //     {
  //       onSuccess: (res: any) => {
  //         const newItems = Array.isArray((res as any)?.data?.result)
  //           ? (res as any).data.result
  //           : Array.isArray((res as any)?.data)
  //           ? (res as any).data
  //           : Array.isArray((res as any)?.result)
  //           ? (res as any).result
  //           : Array.isArray(res as any)
  //           ? (res as any)
  //           : []

  //         const sortedNewItems = newItems.sort((a: any, b: any) => {
  //           const dateA = new Date(a.created_at).getTime()
  //           const dateB = new Date(b.created_at).getTime()
  //           return dateB - dateA
  //         })

  //         const hasMore = newItems.length === 5

  //         setCommentsByFeedId((prev: any) => ({
  //           ...prev,
  //           [feedId]: {
  //             ...prev[feedId],
  //             items: [...(prev[feedId]?.items || []), ...sortedNewItems],
  //             loading: false,
  //             currentPage: nextPage,
  //             hasMore
  //           }
  //         }))

  //         setCommentPageByFeedId((prev: any) => ({
  //           ...prev,
  //           [feedId]: nextPage
  //         }))
  //          setLoadingMore(false);
  //       },
  //       onError: (error: any) => {
  //         setCommentsByFeedId((prev: any) => ({
  //           ...prev,
  //           [feedId]: {
  //             ...prev[feedId],
  //             loading: false,
  //             error: error?.message || 'Failed to load more comments'
  //           }
  //         }))
  //          setLoadingMore(false);
  //       }
  //     }
  //   )
  // }

  const loadMoreComments = async (feedId: string) => {
    if (loadingMore) return;
    setLoadingMore(true);
    const currentPage = commentPageByFeedId[feedId] || 1;
    const nextPage = currentPage + 1;

    fetchCommentsMutation.mutate(
      { id: feedId, limit: 5, page: nextPage },
      {
        onSuccess: (res: any) => {
          const newItems = Array.isArray((res as any)?.data?.result)
            ? (res as any).data.result
            : Array.isArray((res as any)?.data)
              ? (res as any).data
              : Array.isArray((res as any)?.result)
                ? (res as any).result
                : Array.isArray(res as any)
                  ? (res as any)
                  : [];

          // hasMore if we got a full page
          const hasMore = newItems.length === 5;

          setCommentsByFeedId((prev: any) => ({
            ...prev,
            [feedId]: {
              ...prev[feedId],
              items: [...(prev[feedId]?.items || []), ...newItems],
              loading: false,
              currentPage: nextPage,
              hasMore,
            },
          }));

          setCommentPageByFeedId((prev: any) => ({
            ...prev,
            [feedId]: nextPage,
          }));
          setLoadingMore(false);
        },
        onError: (error: any) => {
          setCommentsByFeedId((prev: any) => ({
            ...prev,
            [feedId]: {
              ...prev[feedId],
              loading: false,
              error: error?.message || "Failed to load more comments",
            },
          }));
          setLoadingMore(false);
        },
      },
    );
  };

  // Error state — checked here (after all hooks) to keep the hook order stable.
  if (feedsError) {
    return (
      <div className={styles.feed_post_main_container}>
        <div className={styles.error_message}>
          <p>Error loading feeds: {feedsError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.feed_post_main_container}>
      <style>{`@keyframes commentSendSpin { to { transform: rotate(360deg); } }`}</style>
      <div className={styles.search_panel_main}>
        <div
          className={`${stylesheet.search_panel_area} ${styles.search_panel_area}`}
        >
          <div className={`${styles.search_form_inner} relative`}>
            <form
              onSubmit={handleSearch}
              className={`${stylesheet.search_form} ${styles.search_form_input_area}`}
            >
              <span className={stylesheet.search_icon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={20}
                  height={20}
                  viewBox="0 0 22 22"
                  fill="none"
                >
                  <path
                    d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z"
                    fill="#E3E3E3"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search"
                value={displaySearchInput}
                onChange={handleInputChange}
                className={stylesheet.search_panel}
                suppressHydrationWarning
              />
              {displaySearchInput.length > 2 && isSearching ? (
                <span className={stylesheet.searching_indicator}>
                  <span className="inline-block">
                    <LoaderCircle className="w-4 h-4 mt-[-3px] text-white animate-spin" />
                  </span>
                </span>
              ) : displaySearchInput.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={stylesheet.clear_search_button}
                  aria-label="Clear search"
                  suppressHydrationWarning
                >
                  <X className="w-4 h-4 cursor-pointer mt-[-3px]" />
                </button>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <div className={styles.feed_post_items_wrapper}>
        {allFeeds.length > 0 ? (
          allFeeds.map((feed) => {
            // ✅ move logic here
            const likesCount =
              feed.post_counter.likes_count === "None"
                ? 0
                : Number(feed.post_counter.likes_count);

            const commentsCount =
              feed.post_counter.comments_count === "None"
                ? 0
                : Number(feed.post_counter.comments_count);

            const isLikedByMe = feed.activity.is_liked;

            const Default =
              feed?.author?.type === "company" ? CompanyDefaultImg : null;

            const getRepostInfo = (
              sharedList: any[],
              currentUserId: string | undefined,
            ) => {
              if (
                !sharedList ||
                !Array.isArray(sharedList) ||
                sharedList.length === 0
              ) {
                return null;
              }

              const currentUserInList = sharedList.find(
                (u: any) => u.id === currentUserId,
              );
              const others = sharedList.filter(
                (u: any) => u.id !== currentUserId,
              );

              let text = "";
              if (currentUserInList) {
                if (others.length === 0) {
                  text = "You reposted this";
                } else if (others.length === 1) {
                  text = `You and ${others[0].first_name} ${others[0].last_name} reposted this`;
                } else {
                  text = `You, ${others[0].first_name} ${others[0].last_name} and +${
                    others.length - 1
                  } others reposted this`;
                }
              } else {
                if (sharedList.length === 1) {
                  text = `${sharedList[0].first_name} ${sharedList[0].last_name} reposted this`;
                } else if (sharedList.length === 2) {
                  text = `${sharedList[0].first_name} ${sharedList[0].last_name} and ${sharedList[1].first_name} ${sharedList[1].last_name} reposted this`;
                } else {
                  text = `${sharedList[0].first_name} ${sharedList[0].last_name} and +${
                    sharedList.length - 1
                  } others reposted this`;
                }
              }

              // Get avatars (max 3), put current user first if present
              const avatarUsers = currentUserInList
                ? [currentUserInList, ...others].slice(0, 3)
                : sharedList.slice(0, 3);

              return { text, avatarUsers };
            };

            return (
              <div key={feed.id} className={styles.feed_post_items}>
                {(() => {
                  const repostInfo = getRepostInfo(feed.shared_list, user?.id);
                  if (!repostInfo) return null;
                  return (
                    <div className={styles.feed_repost_label}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setSharedListModal({
                            feedId: feed.id,
                            sharedList: feed.shared_list || [],
                          })
                        }
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {repostInfo.avatarUsers.map(
                            (u: any, index: number) => (
                              <div key={u.id || index}>
                                <Avatar
                                  imageUrl={u.profile_image_url}
                                  firstName={u.first_name}
                                  lastName={u.last_name}
                                  size={18}
                                />
                              </div>
                            ),
                          )}
                        </div>
                        {/* <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width={16}
                          height={16}
                          viewBox='0 0 24 24'
                        >
                          <g
                            fill='none'
                            stroke='#20BDFF'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='1.5'
                          >
                            <path d='M8.5 15S5 17.578 5 18.5S8.5 22 8.5 22' />
                            <path d='M5.5 18.5h8c3.288 0 4.931 0 6.038-.908q.304-.25.554-.554C21 15.93 21 14.288 21 11m-5.5-2S19 6.422 19 5.5S15.5 2 15.5 2' />
                            <path d='M18.5 5.5h-8c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C3 8.07 3 9.712 3 13' />
                          </g>
                        </svg> */}
                        <span
                          style={{ color: isLight ? "#040F1F" : "#FFFFFF" }}
                        >
                          {repostInfo.text}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/* HEADER */}
                <div className={styles.feed_post_item_header}>
                  <div className={styles.feed_post_item_header_left}>
                    <div
                      className={styles.feed_post_item_header_left_img}
                      onClick={() =>
                        router.push(
                          `/${
                            feed?.author?.type === "company"
                              ? "company"
                              : "user"
                          }/${feed?.author?.id}`,
                        )
                      }
                    >
                      <Image
                        src={
                          feed?.author?.color_url ||
                          feed?.author?.logo_url ||
                          Default
                        }
                        width={50}
                        height={50}
                        alt="profile"
                      />
                    </div>
                    <div
                      className={styles.feed_post_item_header_left_name}
                      onClick={() =>
                        router.push(`/company/${feed?.author?.id}`)
                      }
                    >
                      <h4 style={isLight ? { color: "#040F1F" } : undefined}>
                        {feed?.author?.name}
                      </h4>
                      <p style={isLight ? { color: "#888888" } : undefined}>
                        {getTimeAgo(feed?.created_at)}
                      </p>
                    </div>
                  </div>
                  {/* Post 3-dot menu — only for other users' posts */}
                    {feed?.author?.id !== user?.id && (
                      <div style={{ position: "relative" }} data-post-menu>
                        <span
                          className={styles.threedot}
                          style={{ cursor: "pointer", ...(isLight ? { color: "#040F1F" } : {}) }}
                          onClick={() =>
                            setPostMenuOpen(
                              postMenuOpen === feed.id ? null : feed.id,
                            )
                          }
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 256 256">
                            <path fill="#a0aec0" d="M156 128a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-28-52a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0 104a28 28 0 1 0 28 28a28 28 0 0 0-28-28" />
                          </svg>
                        </span>
                        {postMenuOpen === feed.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 8px)",
                              right: 0,
                              zIndex: 10,
                              background: isLight
                                ? "#fff"
                                : "linear-gradient(#040f1f, #040f1f) padding-box, linear-gradient(91.13deg, #5433ff 2.22%, #20bdff 97.08%) border-box",
                              border: isLight ? "1px solid #ef4444" : "1px solid #0000",
                              borderRadius: "6px",
                              boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(0,0,0,0.3)",
                              minWidth: "140px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={() => {
                                setPostMenuOpen(null);
                                ensureAuthed("report this", () =>
                                  setReportDialog({ type: "post", id: feed.id }),
                                );
                              }}
                              style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: "14px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "background-color 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#FEF2F2" : "#2a2a2a")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                              </svg>
                              <span>Report</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* BODY */}
                <div className={styles.feed_post_item_body}>
                  <ReadMoreCaption content={feed.text_content} wordLimit={10} />

                  <div className={styles.feed_post_item_body_images}>
                    <FeedGallery
                      feed={feed}
                      onModalClose={(state: any) => {
                        if (feedsData?.pages) {
                          const updatedPages = feedsData.pages.map((page) => ({
                            ...page,
                            data: {
                              ...page.data,
                              result:
                                page.data?.result?.map((f: any) => {
                                  if (f.id === state.feedId) {
                                    return {
                                      ...f,
                                      activity: {
                                        ...f.activity,
                                        is_liked: state.isLiked,
                                        is_shared: state.isReposted,
                                      },
                                      post_counter: {
                                        ...f.post_counter,
                                        likes_count: state.likes.toString(),
                                        comments_count:
                                          state.comments.toString(),
                                        shares_count: state.shares.toString(),
                                      },
                                    };
                                  }
                                  return f;
                                }) || [],
                            },
                          }));
                          queryClient.setQueryData(
                            ["feeds", serverSearchInput],
                            {
                              pages: updatedPages,
                              pageParams: feedsData.pageParams,
                            },
                          );
                        }
                      }}
                    />
                  </div>

                  {/* BOTTOM */}
                  <div className={styles.feed_post_item_body_bottom_area}>
                    <div
                      className={styles.feed_post_item_body_bottom_area_left}
                    >
                      {likesCount > 0 && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={20}
                          height={20}
                          viewBox="0 0 25 25"
                          fill="none"
                        >
                          <path
                            d="M1.5625 13.2813V21.0938C1.5625 22.3859 2.61406 23.4375 3.90625 23.4375H6.25V10.9375H3.90625C2.61406 10.9375 1.5625 11.9891 1.5625 13.2813ZM22.7672 10.6484C22.4784 10.2516 22.0994 9.92919 21.6615 9.70777C21.2235 9.48634 20.7392 9.37228 20.2484 9.37501H14.8844L15.6094 5.75001C15.7111 5.24212 15.6989 4.71798 15.5735 4.21541C15.4481 3.71283 15.2127 3.24435 14.8844 2.84376C14.5569 2.44248 14.144 2.11926 13.6759 1.89762C13.2077 1.67598 12.6961 1.5615 12.1781 1.56251C11.4844 1.56251 10.8672 2.02813 10.6922 2.64532L9.96719 4.65469C9.40092 6.22058 8.67963 7.72597 7.81406 9.14844V23.4375H17.8094C18.476 23.4399 19.1258 23.228 19.6629 22.833C20.2 22.438 20.5959 21.8809 20.7922 21.2438L23.2328 13.4313C23.3814 12.9637 23.4167 12.4675 23.3357 11.9837C23.2547 11.4998 23.0599 11.0422 22.7672 10.6484Z"
                            fill={isLight ? "#356FEE" : "#20BDFF"}
                          />
                        </svg>
                      )}
                      <span
                        className={
                          styles.feed_post_item_body_bottom_area_left_reactions_text
                        }
                        style={isLight ? { color: "#888888" } : undefined}
                      >
                        {likesCount > 0 && `${likesCount} ${likesCount === 1 ? "Like" : "Likes"}`}

                        {likesCount > 0 && commentsCount > 0 && " | "}
                        {commentsCount > 0 && (
                          <span
                            onClick={() => toggleCommentSection(feed.id)}
                            style={{ cursor: "pointer" }}
                          >
                            {`${commentsCount} Comments`}
                          </span>
                        )}
                        {(likesCount > 0 || commentsCount > 0) &&
                          feed.post_counter.shares_count !== "None" &&
                          Number(feed.post_counter.shares_count) > 0 &&
                          " | "}
                        {feed.post_counter.shares_count !== "None" &&
                          Number(feed.post_counter.shares_count) > 0 &&
                          `${Number(feed.post_counter.shares_count)} Shares`}
                      </span>
                    </div>

                    {/* RIGHT ACTIONS */}
                    <div
                      className={styles.feed_post_item_body_bottom_area_right}
                    >
                      <div
                        className={
                          styles.feed_post_item_body_bottom_area_right_like
                        }
                        onMouseEnter={(e) => handleReactionHover(feed.id, e)}
                        onMouseLeave={handleReactionLeave}
                        onClick={() => {
                          const action =
                            feed?.activity?.is_liked === true
                              ? "remove"
                              : "add";
                          handleAddReaction({
                            id: feed.id,
                            type: "like",
                            action,
                          });
                        }}
                        style={{
                          opacity:
                            likeLoadingId === feed.id.toString() ? 0.5 : 1,
                          pointerEvents:
                            likeLoadingId === feed.id.toString()
                              ? "none"
                              : "auto",
                        }}
                      >
                        <span
                          className={
                            styles.feed_post_item_body_bottom_area_right_like_icon
                          }
                        >
                          {feed?.activity?.is_liked === true ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={20}
                              height={20}
                              viewBox="0 0 25 25"
                              fill="none"
                            >
                              <path
                                d="M1.5625 13.2813V21.0938C1.5625 22.3859 2.61406 23.4375 3.90625 23.4375H6.25V10.9375H3.90625C2.61406 10.9375 1.5625 11.9891 1.5625 13.2813ZM22.7672 10.6484C22.4784 10.2516 22.0994 9.92919 21.6615 9.70777C21.2235 9.48634 20.7392 9.37228 20.2484 9.37501H14.8844L15.6094 5.75001C15.7111 5.24212 15.6989 4.71798 15.5735 4.21541C15.4481 3.71283 15.2127 3.24435 14.8844 2.84376C14.5569 2.44248 14.144 2.11926 13.6759 1.89762C13.2077 1.67598 12.6961 1.5615 12.1781 1.56251C11.4844 1.56251 10.8672 2.02813 10.6922 2.64532L9.96719 4.65469C9.40092 6.22058 8.67963 7.72597 7.81406 9.14844V23.4375H17.8094C18.476 23.4399 19.1258 23.228 19.6629 22.833C20.2 22.438 20.5959 21.8809 20.7922 21.2438L23.2328 13.4313C23.3814 12.9637 23.4167 12.4675 23.3357 11.9837C23.2547 11.4998 23.0599 11.0422 22.7672 10.6484Z"
                                fill={isLight ? "#356FEE" : "#20BDFF"}
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={20}
                              height={20}
                              viewBox="0 0 25 25"
                              fill="none"
                            >
                              <path
                                d="M20.311 9.37499H16.675L17.511 6.59061C17.6854 6.00737 17.7213 5.39145 17.6156 4.79192C17.51 4.19238 17.2658 3.62581 16.9025 3.13732C16.5392 2.64883 16.0669 2.25194 15.5231 1.97826C14.9793 1.70457 14.3791 1.56167 13.7703 1.56092C13.4786 1.55991 13.1924 1.6406 12.9441 1.79387C12.6959 1.94713 12.4955 2.16683 12.3656 2.42811L9.1094 8.94061C9.04445 9.07022 8.94473 9.17919 8.82138 9.25535C8.69803 9.33152 8.55593 9.37186 8.41096 9.37186H4.68909C2.96565 9.37186 1.56409 10.7734 1.56409 12.4969V20.3094C1.56409 22.0328 2.96565 23.4344 4.68909 23.4344H17.4422C19.886 23.4344 20.7547 21.5562 21.1953 20.1453L23.2938 13.4312C23.3896 13.125 23.4375 12.8125 23.4375 12.4937C23.4367 11.6652 23.1069 10.8709 22.5206 10.2855C21.9343 9.70007 21.1395 9.37145 20.311 9.37186V9.37499ZM3.12502 20.3125V12.5C3.12502 11.639 3.82659 10.9375 4.68752 10.9375H6.25002V21.875H4.68752C3.82659 21.875 3.12502 21.1734 3.12502 20.3125ZM21.8031 12.9656L19.7047 19.6812C19.136 21.5015 18.3891 21.8734 17.4422 21.8734H7.81409V10.9359H8.41096C9.30471 10.9359 10.1078 10.439 10.5078 9.64061L13.7641 3.12811L13.7703 3.12498C14.1358 3.12509 14.4961 3.21066 14.8226 3.37485C15.1491 3.53903 15.4327 3.77729 15.6507 4.0706C15.8687 4.3639 16.0151 4.70412 16.0782 5.06408C16.1413 5.42404 16.1193 5.79377 16.0141 6.14373L14.8766 9.9328C14.8415 10.0495 14.8342 10.1728 14.8552 10.2928C14.8763 10.4128 14.9251 10.5263 14.9979 10.6241C15.0706 10.7218 15.1652 10.8012 15.2741 10.8559C15.383 10.9106 15.5032 10.9391 15.625 10.939H20.311C20.5562 10.9389 20.7981 10.9964 21.017 11.1071C21.236 11.2178 21.4257 11.3784 21.571 11.576C21.7163 11.7737 21.813 12.0027 21.8534 12.2447C21.8937 12.4866 21.8765 12.7347 21.8031 12.9687V12.9656Z"
                                fill={isLight ? "#888888" : "#E3E3E3"}
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`${
                            styles.feed_post_item_body_bottom_area_right_like_text
                          } ${
                            feed?.activity?.is_liked === true
                              ? styles.feed_post_item_body_bottom_area_right_like_text_active
                              : ""
                          }`}
                        >
                          Like
                        </span>
                      </div>
                      <div
                        className={
                          styles.feed_post_item_body_bottom_area_right_comment
                        }
                        onClick={() => toggleCommentSection(feed.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <span
                          className={
                            styles.feed_post_item_body_bottom_area_right_like_icon
                          }
                        >
                          {feed?.activity?.is_comment === true ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              width={19}
                              height={19}
                              viewBox="0 0 20 20"
                              fill={isLight ? "#356FEE" : "#20BDFF"}
                            >
                              <mask
                                id="mask0_2002_2927"
                                style={{ maskType: "alpha" }}
                                maskUnits="userSpaceOnUse"
                                x={0}
                                y={0}
                                width={20}
                                height={20}
                              >
                                <rect
                                  width={20}
                                  height={20}
                                  fill="url(#pattern0_2002_2927)"
                                />
                              </mask>
                              <g mask="url(#mask0_2002_2927)">
                                <rect
                                  y="0.5"
                                  width={20}
                                  height={19}
                                  fill={isLight ? "#356FEE" : "#20BDFF"}
                                />
                              </g>
                              <defs>
                                <pattern
                                  id="pattern0_2002_2927"
                                  patternContentUnits="objectBoundingBox"
                                  width={1}
                                  height={1}
                                >
                                  <use
                                    xlinkHref="#image0_2002_2927"
                                    transform="scale(0.01)"
                                  />
                                </pattern>
                                <image
                                  id="image0_2002_2927"
                                  width={100}
                                  height={100}
                                  preserveAspectRatio="none"
                                  xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAHrUlEQVR4nO2de7BVUxjAf70p0Qu9PNKtSCpUJhHGoNAwwh8I41keE4OoqUTkUXkbpDzKkMeYFBkzxQylhwhRE3rQ7UU1SvS895plvjP2fLPPPeucvfc9e5+9fjNrprndtda3vnX3enzrW98Ch8PhcDgcDkc6qQd0AvoDtwATgOnAbOBTYAmwXNIS+dls+Z0Jkqcf0FHKcuRJK2CgKHMesAuoCintkjJN2ZdIXQ4fjgGGirIqQ+wAm/QjMAboTMppBtwtQ02hyvwH2AaslrRNfhakc+4CmpIiegCvWCpuH/AN8BJwD3ApcBLQ3KKe5vK7Js8wKWOplGnT0VMkf8lyIvBRDkVUAPOB4UBfoFEEcpgyzwBGAF9KndXJNAvoRgnRUVY82eYG8/M5wM1AyyLI1xoYDMytRkbTaW8CZSQYs8S8F9idpZF/yjASp8m0DHgU2JJF5r3y//VJGKcAy7I0agNwK3Ag8aUhcDuwMUsbvpO5MPbUliXkfp9GbJUvxjQ2KTSS+WybT3tMG0cBtYgpTYAPs8wRUxK+lGwGvJZljpkJHELM6AL87CPsL8DZlA7nyH5Ht/Mn4HhiNF/4fdJTEzY85TOMvZFlSO5FkTF7he0+mzkzV5Q6NwF7VNt3FnNEONdnt22Wi31ID6fJl+HVwd/F6JQuso/wCrIJ6Er6OA5Yr3SxoyZ392Zn+5sSYC3QgfTSDlildFIOtI264oZioNNfhhEo7bQHfle6+TrqDfALPlbR3lFWmDB6yhzi1dEzUVV2gdoYGYPbxVFVlmAGKj2Zf58XdiWHydDk7fnxYVdSQjzhY7+zOcOxZoqqwBgODwizghKjgRggvTp7MazCuypj4a44mQlizAnq6GF/WHr7RPX0uDAKTQmPK90Z96RAnKUK3AwcHI6sqaAJ8IfSoTk+LpgPVGFDwpM1NdymdPh+oQUdreaODQGPLs8H1mQ5gYtzWiNek4VSX61QjU6PLKSg8Uqw0QRDm1uSlMoDtv1BVd4jhRzFes+T94TgEbIuBoqtKjAZ2YPQRhwkMuWtz/fot6cS6D2C0z/LaVvc02px1g6Kno/zcsJ7QGW+OgSB0s71Sqf355N5ibJZHRqdnKmhpfKSXJyPid27uloQrZypYpFHr/ttzU96/ngqejlTw7OFzCPXqUxm7HOE5xjh1e01NpkmqkzGzccRDr0LOcKYrjIl2eMwbjRXujUe9Tn5WJ12mU2iIxzqqNNEK+vvfE8G4wSXVFvVGksbVFC587V17fDkNXcqc/KDJ4OxPyXZVlVeQ3KXF2hCMrrOyQrV+7a4DrGjXB2F58Trd2XMxkm1Va22tEEFlTtfW1feQ9YXyu/KEd2kbi7B5uQd9RdgLqs4irjsfVJl6h6SMA44tZCN4RCV6cro5UwNg5VuB9neeci7Fx1WPFeIcfEgddy40K4uhwWL1U0za+/PhSpj7G6ZJpBW6oDKnI1Y87D6tK6NTs7UcIPSqbnjbk0vldnEIglK3GxdVTXkl5VhpirXBOOxppYyKVSIK0sQvCaDtLkBtVVhodYVEgFCO3eZmFNBSLNf1kOqPDMlBHYl3RgwEEDcbF1VNeSX1UCc1DPlmS/liEILm6qEM1HdHPkxVOnwXQLQQY19xrXeXUewp6lP7C0T/SIQr6oCxwYtMEVMVLoz0ZJCuX/t3bmbf58cRsElTjcVC2WfRH0IhTGqp5fHPCJcsTET+fdKZ8+HHT/xW1WBufrr8OdppavyKM6Vuquhy2wWLwu7khLgcp/AASbwWSSMUj1vrkifHlVlCaSPT6z6SH2ja8vlHW+FW8OcrBJMB58bt1/VRICFhsqunwnPZFZjaaWTj2lobU0GhjYV/aoE2JLSyECdfQKYbS9GMLfOclXaK8hfEvovLfT1CfG3UwIuFIX2PgbDvSkJMHCHWnVmvgzjk1BU2si7G9pKOgNoQenR2OfKRmbIjk348RbK4zGTNkS5Bi8C/WSy1u1cGbNHBf6jLvCYTzjuSlv/oxhj/uCmZTkvmRF3J5ALfSY66yvAMcO4RI30CYmbMRaOiHMwfi/tlPALE9gRd/pEGc2kpUl7Dqm1aoBx4E4Cx0oUUb8vImMqGi7Dc6IYoBpiQnXElbbywMxnOZ48mibP+yUS7WhnQszmG8q8V0R2oMYSm320zG253k2cIfIkGm9Ezv15ngWMVZtME3dlkrx5OECUc3iO28G1JLRtDzGH3we8LHL5vf5T5bPbnlQqr7OVqcaZa9Y21PIJmlZdqpB3SzZL3PXMw5LZHiGzSctkB25iJZYM2insCksL8vQAiiw0VchbhsNK9TGBeioS3XYL57pOWV50mwW8LWYZm9c5bZKJy/65PH13kQxrJc0gpQBzQSUbdeUv0+8J1tfVHFFfjpCvEhfXydJhC2SOWel5vnuOuNu8JXFzB4sFuixtz3fXk0fAMkrdXc37Gf19nCaqPJ1hbqs6AnJjDreXOrL8nZelIyrj/i5g0lwmN/l8HXXExDAux3WETXJ/xBESk5WCV8k4ns0E4U3GacLFdAyRMy12u35pURiOx47q42vZrPtny5LTzRVF6pBKMVcbA+NRUQnh+J8y6ZQVsg+YKw/5jpTDqpLffDkcDofD4XA4iDn/Aq3pXnml+jd7AAAAAElFTkSuQmCC"
                                />
                              </defs>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              width={19}
                              height={19}
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <mask
                                id="mask0_2002_2927"
                                style={{ maskType: "alpha" }}
                                maskUnits="userSpaceOnUse"
                                x={0}
                                y={0}
                                width={20}
                                height={20}
                              >
                                <rect
                                  width={20}
                                  height={20}
                                  fill="url(#pattern0_2002_2927)"
                                />
                              </mask>
                              <g mask="url(#mask0_2002_2927)">
                                <rect
                                  y="0.5"
                                  width={20}
                                  height={19}
                                  fill={isLight ? "#888888" : "#E3E3E3"}
                                />
                              </g>
                              <defs>
                                <pattern
                                  id="pattern0_2002_2927"
                                  patternContentUnits="objectBoundingBox"
                                  width={1}
                                  height={1}
                                >
                                  <use
                                    xlinkHref="#image0_2002_2927"
                                    transform="scale(0.01)"
                                  />
                                </pattern>
                                <image
                                  id="image0_2002_2927"
                                  width={100}
                                  height={100}
                                  preserveAspectRatio="none"
                                  xlinkHref="data:image/png;base64,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"
                                />
                              </defs>
                            </svg>
                          )}
                        </span>
                        <span
                          className={`${
                            styles.feed_post_item_body_bottom_area_right_like_text
                          } ${
                            feed?.activity?.is_comment === true
                              ? styles.feed_post_item_body_bottom_area_right_like_text_active
                              : ""
                          }`}
                        >
                          Comment
                        </span>
                      </div>
                      <div
                        className={
                          styles.feed_post_item_body_bottom_area_right_repost
                        }
                        // onClick={() => handleRepost(feed.id)}
                        onClick={() => {
                          if (feed?.activity?.is_shared) {
                            setUnrepostConfirmModal({ feedId: feed.id });
                          } else {
                            handleRepost(feed.id);
                          }
                        }}
                        style={{
                          cursor: "pointer",
                          opacity:
                            repostLoadingId === feed.id.toString() ? 0.5 : 1,
                          pointerEvents:
                            repostLoadingId === feed.id.toString()
                              ? "none"
                              : "auto",
                        }}
                      >
                        <span
                          className={`${styles.feed_post_item_body_bottom_area_right_like_icon}   `}
                        >
                          {feed?.activity?.is_shared === true ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={20}
                              height={20}
                              viewBox="0 0 24 24"
                            >
                              <g
                                fill="none"
                                stroke={isLight ? "#356FEE" : "#20BDFF"}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              >
                                <path d="M8.5 15S5 17.578 5 18.5S8.5 22 8.5 22" />
                                <path d="M5.5 18.5h8c3.288 0 4.931 0 6.038-.908q.304-.25.554-.554C21 15.93 21 14.288 21 11m-5.5-2S19 6.422 19 5.5S15.5 2 15.5 2" />
                                <path d="M18.5 5.5h-8c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C3 8.07 3 9.712 3 13" />
                              </g>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={20}
                              height={20}
                              viewBox="0 0 24 24"
                            >
                              <g
                                fill="none"
                                stroke={
                                  isLight ? "#888888" : "rgba(255, 255, 255, 1)"
                                }
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              >
                                <path d="M8.5 15S5 17.578 5 18.5S8.5 22 8.5 22" />
                                <path d="M5.5 18.5h8c3.288 0 4.931 0 6.038-.908q.304-.25.554-.554C21 15.93 21 14.288 21 11m-5.5-2S19 6.422 19 5.5S15.5 2 15.5 2" />
                                <path d="M18.5 5.5h-8c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C3 8.07 3 9.712 3 13" />
                              </g>
                            </svg>
                          )}
                        </span>
                        <span
                          className={`${
                            styles.feed_post_item_body_bottom_area_right_like_text
                          } ${
                            feed?.activity?.is_shared === true
                              ? styles.feed_post_item_body_bottom_area_right_like_text_active
                              : ""
                          }`}
                        >
                          {feed?.activity?.is_shared === true
                            ? "Reposted"
                            : "Repost"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`${
                      styles.feed_post_item_body_bottom_area_right_comment_list_main
                    } ${
                      openCommentSections.has(feed.id)
                        ? styles.feed_post_item_body_bottom_area_right_comment_list_main_open
                        : styles.feed_post_item_body_bottom_area_right_comment_list_main_closed
                    }`}
                    style={{
                      display: openCommentSections.has(feed.id)
                        ? "block"
                        : "none",
                      maxHeight: openCommentSections.has(feed.id)
                        ? "600px"
                        : "0px",
                      overflow: "hidden",
                      transition: "max-height 0.3s ease-in-out",
                    }}
                  >
                    <div
                      className={
                        styles.feed_post_item_body_bottom_area_right_comment_list_comment_area
                      }
                    >
                      <div
                        className={
                          styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_Profile
                        }
                        onClick={() => router.push(`/profile/${user?.id}`)}
                      >
                        <Avatar
                          imageUrl={user?.profile_image_url || null}
                          firstName={user?.first_name}
                          lastName={user?.last_name}
                          size={40}
                          className='w-full h-full object-cover cursor-pointer'
                        />
                      </div>
                      <div className={styles.comment_panel_main}>
                        <div
                          className={`${stylesheet.search_panel_area} ${styles.search_panel_area}`}
                        >
                          {/* <form
                            onSubmit={handleSearch}
                            className={stylesheet.search_form}
                          >
                            <input
                              type='text'
                              placeholder='Write a comment...'
                              value={commentInputs[feed.id] || ''}
                              onChange={e =>
                                handleCommentInputChange(
                                  feed.id,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendComment(feed.id);
                                }
                              }}
                              maxLength={500}
                              className={`${stylesheet.search_panel} ${styles.comment_panel}`}
                              suppressHydrationWarning
                            /> */}

                          <form
                            onSubmit={handleSearch}
                            className={stylesheet.search_form}
                          >
                            <textarea
                              placeholder="Write a comment..."
                              value={commentInputs[feed.id] || ""}
                              onChange={(e) => {
                                handleCommentInputChange(
                                  feed.id,
                                  e.target.value,
                                );
                                e.target.style.height = "auto";
                                e.target.style.height =
                                  Math.min(e.target.scrollHeight, 100) + "px";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendComment(feed.id);
                                }
                              }}
                              maxLength={500}
                              rows={1}
                              data-feed-id={feed.id}
                              className={`${stylesheet.search_panel} ${styles.comment_panel}`}
                              suppressHydrationWarning
                            />
                            <span
                              className={styles.comment_panel_media_upload_icon}
                            >
                              <Image
                                src={MediaUpload}
                                alt="Media Upload "
                                width={20}
                                height={20}
                                onClick={() => handleImageUploadClick(feed.id)}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                ref={(el) => {
                                  if (el) fileInputRefs.current[feed.id] = el;
                                }}
                                onChange={(e) => handleFileSelected(feed.id, e)}
                              />
                              <div
                                className={styles.comment_panel_sendComment}
                                onClick={() => {
                                  const isDisabled =
                                    (!commentInputs[feed.id]?.trim() &&
                                      !commentImages[feed.id]) ||
                                    commentLoadingId === feed.id.toString();
                                  if (!isDisabled) handleSendComment(feed.id);
                                }}
                                style={{
                                  opacity:
                                    (!commentInputs[feed.id]?.trim() &&
                                      !commentImages[feed.id]) ||
                                    commentLoadingId === feed.id.toString()
                                      ? 0.5
                                      : 1,
                                  pointerEvents:
                                    (!commentInputs[feed.id]?.trim() &&
                                      !commentImages[feed.id]) ||
                                    commentLoadingId === feed.id.toString()
                                      ? "none"
                                      : "auto",
                                  cursor:
                                    (!commentInputs[feed.id]?.trim() &&
                                      !commentImages[feed.id]) ||
                                    commentLoadingId === feed.id.toString()
                                      ? "default"
                                      : "pointer",
                                }}
                              >
                                {commentLoadingId === feed.id.toString() ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    style={{
                                      animation: "commentSendSpin 1s linear infinite",
                                      transformOrigin: "center",
                                    }}
                                    aria-label="Sending comment"
                                  >
                                    <path
                                      fill="none"
                                      stroke={isLight ? "#356FEE" : "#FFFFFF"}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6V3m4.25 4.75L18.4 5.6M18 12h3m-4.75 4.25l2.15 2.15M12 18v3m-4.25-4.75L5.6 18.4M6 12H3m4.75-4.25L5.6 5.6"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      fill={isLight ? "#356FEE" : "#20BDFF"}
                                      d="M20.04 2.323c1.016-.355 1.992.621 1.637 1.637l-5.925 16.93c-.385 1.098-1.915 1.16-2.387.097l-2.859-6.432l4.024-4.025a.75.75 0 0 0-1.06-1.06l-4.025 4.024l-6.432-2.859c-1.063-.473-1-2.002.097-2.387z"
                                    />
                                  </svg>
                                )}
                              </div>
                            </span>
                          </form>
                        </div>
                        {/* Image Preview Section */}
                        {commentImages[feed.id] && (
                          <div
                            style={{
                              width: "100%",
                              borderTop: "1px solid #20bdff",
                            }}
                          >
                            <div
                              style={{
                                marginTop: "20px",
                                padding: "10px",
                                backgroundColor: "#f0f0f0",
                                borderRadius: "8px",
                                width: "max-content",
                                maxWidth: " calc(100% - 100px)",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                position: "relative",
                                marginLeft: "20px",
                                marginBottom: "20px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flex: 1,
                                }}
                              >
                                <Image
                                  src={URL.createObjectURL(
                                    commentImages[feed.id]!,
                                  )}
                                  alt="Selected image preview"
                                  width={120}
                                  height={120}
                                  style={{
                                    borderRadius: "4px",
                                    objectFit: "cover",
                                    maxHeight: "120px",
                                  }}
                                />
                                {/* <div style={{ flex: 1 }}>
                                <p
                                  style={{
                                    margin: '0',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333'
                                  }}
                                >
                                  {commentImages[feed.id]!.name}
                                </p>
                                <p
                                  style={{
                                    margin: '0',
                                    fontSize: '11px',
                                    color: '#666'
                                  }}
                                >
                                  {(
                                    commentImages[feed.id]!.size / 1024
                                  ).toFixed(2)}{' '}
                                  KB
                                </p>
                              </div> */}
                              </div>
                              <button
                                onClick={() => handleRemoveImage(feed.id)}
                                style={{
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "absolute",
                                  top: "4px",
                                  right: "4px",
                                  backgroundColor: "#000000bf",
                                  borderRadius: "50%",
                                }}
                                title="Remove image"
                              >
                                <X
                                  size={18}
                                  style={{
                                    color: "#ffffff",
                                    cursor: "pointer",
                                  }}
                                />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={
                        styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom
                      }
                    >
                      <p className={isLight ? "text-[#888888]" : undefined}>
                        Most relevent comments (
                        {feed.post_counter.comments_count
                          ? feed.post_counter.comments_count
                          : 0}
                        ){" "}
                      </p>
                      <div
                        className={`${styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items} hide-scrollbar`}
                      >
                        {commentsByFeedId[feed.id]?.loading ? (
                          <p
                            className={
                              isLight ? "text-[#888888]" : "text-sm text-[#FFF]"
                            }
                          >
                            Loading comments...
                          </p>
                        ) : commentsByFeedId[feed.id]?.error ? (
                          <p
                            className={
                              isLight
                                ? "text-[#888888]"
                                : "text-sm text-red-500"
                            }
                          >
                            {commentsByFeedId[feed.id]?.error}
                          </p>
                        ) : (commentsByFeedId[feed.id]?.items || []).length >
                          0 ? (
                          [...(commentsByFeedId[feed.id]?.items || [])].map(
                            (comment: any, index: number) => (
                              <div
                                key={index}
                                className={
                                  styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item
                                }
                              >
                                <div
                                  className={
                                    styles.feed_post_comment_area_header_area
                                  }
                                >
                                  {/* <div className={styles.feed_post_bio_are}> */}
                                    {/* <Image
                                      src={
                                        comment.author?.profile_image_url ||
                                        UserDefaultImg
                                      }
                                      alt='Profile'
                                      width={40}
                                      height={40}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        const targetPath =
                                          comment.author?.id === user?.id
                                            ? `/profile/${user?.id}`
                                            : `/user/${comment.author?.id}`
                                        router.push(targetPath)
                                      }}
                                    /> */}
                                    <Avatar
                                      imageUrl={
                                        comment.author?.profile_image_url ||
                                        null
                                      }
                                      firstName={
                                        comment.author?.first_name?.split(
                                          " ",
                                        )[0]
                                      }
                                      lastName={
                                        comment.author?.last_name ||
                                        comment.author?.first_name
                                          ?.split(" ")
                                          .slice(1)
                                          .join(" ")
                                      }
                                      size={32}
                                      className="comment-avatar-image shrink-0"
                                      onClick={() => {
                                        const targetPath =
                                          comment.author?.id === user?.id
                                            ? `/profile/${user?.id}`
                                            : `/user/${comment.author?.id}`;
                                        router.push(targetPath);
                                      }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        className={
                                          styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_profile_name_first_name
                                        }
                                        style={{
                                          cursor: "pointer",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          ...(isLight
                                            ? { color: "#3960FB" }
                                            : {}),
                                        }}
                                        onClick={() => {
                                          const targetPath =
                                            comment.author?.id === user?.id
                                              ? `/profile/${user?.id}`
                                              : `/user/${comment.author?.id}`;
                                          router.push(targetPath);
                                        }}
                                      >
                                        {comment.author?.first_name}{" "}
                                        {comment.author?.last_name}
                                      </div>
                                    </div>
                                  {/* </div> */}

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
                                        ...(isLight
                                          ? { color: "#888888" }
                                          : {}),
                                      }}
                                    >
                                      {getCompactTimeAgo(comment.created_at)}
                                    </span>
                                    <div
                                      style={{ position: "relative" }}
                                      data-comment-menu
                                    >
                                      <span
                                        className={styles.threedot}
                                        style={{
                                          cursor: "pointer",
                                          ...(isLight ? { color: "#040F1F" } : {}),
                                        }}
                                        onClick={() =>
                                          setCommentMenuOpen(
                                            commentMenuOpen === (comment.id || comment._id)
                                              ? null
                                              : comment.id || comment._id,
                                          )
                                        }
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 256 256">
                                          <path fill="#a0aec0" d="M156 128a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-28-52a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0 104a28 28 0 1 0 28 28a28 28 0 0 0-28-28" />
                                        </svg>
                                      </span>
                                      {commentMenuOpen === (comment.id || comment._id) && (
                                        <div
                                          style={{
                                            position: "absolute",
                                            top: "calc(100% + 8px)",
                                            right: 0,
                                            zIndex: 10,
                                            background: isLight
                                              ? "#fff"
                                              : "linear-gradient(#040f1f, #040f1f) padding-box padding-box, linear-gradient(91.13deg, #5433ff 2.22%, #20bdff 97.08%) border-box",
                                            border: isLight ? "1px solid #ef4444" : "1px solid #0000",
                                            borderRadius: "6px",
                                            boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(0,0,0,0.3)",
                                            minWidth: "120px",
                                            overflow: "hidden",
                                          }}
                                        >
                                          {comment.author?.id === user?.id ? (
                                            <div
                                              onClick={() =>
                                                setDeleteConfirmModal({
                                                  commentId: comment.id || comment._id,
                                                  feedId: feed.id,
                                                })
                                              }
                                              style={{
                                                padding: "8px 16px",
                                                cursor: "pointer",
                                                color: "#ef4444",
                                                fontSize: "14px",
                                                fontWeight: "600",
                                                transition: "background-color 0.15s",
                                                display: "flex",
                                                justifyContent: "start",
                                                alignItems: "center",
                                                gap: "6px",
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#FEF2F2" : "#2a2a2a")}
                                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                              <Trash2 size={14} color="#ef4444" className="h-4 w-4" />
                                              <span>Remove</span>
                                            </div>
                                          ) : (
                                            // <></>
                                            <div
                                              onClick={() => {
                                                setCommentMenuOpen(null);
                                                ensureAuthed("report this", () =>
                                                  setReportDialog({ type: "comment", id: comment.id || comment._id }),
                                                );
                                              }}
                                              style={{
                                                padding: "8px 16px",
                                                cursor: "pointer",
                                                color: "#ef4444",
                                                fontSize: "14px",
                                                fontWeight: "600",
                                                transition: "background-color 0.15s",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#FEF2F2" : "#2a2a2a")}
                                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                                              </svg>
                                              <span>Report</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={
                                    styles.feed_post_comment_area_body_area
                                  }
                                >
                                  {comment?.comment_media_urls ? (
                                    <>
                                      {Array.isArray(
                                        comment.comment_media_urls,
                                      ) ? (
                                        comment.comment_media_urls.map(
                                          (url: string, index: number) => (
                                            <div
                                              key={index}
                                              style={{
                                                marginTop: "8px",
                                                marginBottom: "8px",
                                                borderRadius: "4px",
                                                overflow: "hidden",
                                              }}
                                            >
                                              <Image
                                                src={url}
                                                alt={`Comment Media ${
                                                  index + 1
                                                }`}
                                                width={200}
                                                height={200}
                                                className={
                                                  styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_comment_media
                                                }
                                                style={{
                                                  maxWidth: "200px",
                                                  maxHeight: "200px",
                                                  objectFit: "cover",
                                                  cursor: "pointer",
                                                  borderRadius: "4px",
                                                  marginBottom: "10px",
                                                }}
                                                onClick={() =>
                                                  setFullscreenCommentImage(url)
                                                }
                                              />
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <div
                                          style={{
                                            marginTop: "8px",
                                            marginBottom: "8px",
                                            borderRadius: "4px",
                                            overflow: "hidden",
                                          }}
                                        >
                                          <Image
                                            src={
                                              comment.comment_media_urls as string
                                            }
                                            alt="Comment Media"
                                            width={200}
                                            height={200}
                                            className={
                                              styles.feed_post_item_body_bottom_area_right_comment_list_comment_area_bottom_items_item_comment_media
                                            }
                                            style={{
                                              maxWidth: "160px",
                                              maxHeight: "160px",
                                              objectFit: "cover",
                                              cursor: "pointer",
                                              borderRadius: "4px",
                                            }}
                                            onClick={() =>
                                              setFullscreenCommentImage(
                                                comment.comment_media_urls as string,
                                              )
                                            }
                                          />
                                        </div>
                                      )}
                                    </>
                                  ) : null}
                                  <div
                                    style={{ marginTop: "10px" }}
                                    className={styles.feed_comment}
                                  >
                                    {comment.comment_text}
                                  </div>
                                </div>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-sm text-[#FFF]">No comments</p>
                        )}

                        {commentsByFeedId[feed.id]?.hasMore && (
                          <div
                            className="cursor-pointer text-blue-500 hover:text-blue-700 text-sm font-medium"
                            onClick={() => loadMoreComments(feed.id)}
                          >
                            <div className="load-more">
                              {loadingMore ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin relative z-10" />
                              ) : (
                                "Load more comments..."
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <>
            {feedsLoading ? (
              <FeedPostSkeleton />
            ) : (
              <div
                className="text-center"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  padding: "20px 0",
                  minHeight: "60vh",
                  width: "100%",
                }}
              >
                <Image
                  src={FeedIcon}
                  alt="No feeds"
                  width={24}
                  height={24}
                  style={{
                    opacity: 0.5,
                    ...(isLight
                      ? {
                          filter:
                            "brightness(0) saturate(100%) invert(3%) sepia(15%) saturate(4962%) hue-rotate(186deg) brightness(97%) contrast(101%)",
                        }
                      : {}),
                  }}
                />
                <p
                  style={{
                    color: isLight ? "#040F1F" : "rgb(144 161 185)",
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  No posts yet
                </p>
                <p
                  style={{
                    color: isLight ? "#555" : "rgb(144 161 185)",
                    margin: 0,
                    fontSize: "12px",
                  }}
                >
                  Be the first to share something
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <div ref={observerTarget}>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center py-6'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
          </div>
        )}
      </div>
      {fullscreenCommentImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            cursor: "pointer",
          }}
          onClick={() => setFullscreenCommentImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenCommentImage(null);
            }}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              color: "white",
              background: "none",
              border: "none",
              fontSize: "32px",
              cursor: "pointer",
              zIndex: 10001,
            }}
          >
            &times;
          </button>
          <img
            src={fullscreenCommentImage}
            alt="Full screen"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Shared List Modal */}
      {sharedListModal && (
        <RepostSharedListModal
          sharedList={sharedListModal.sharedList}
          currentUserId={user?.id}
          onClose={() => setSharedListModal(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmModal}
        onClose={() => setDeleteConfirmModal(null)}
        onConfirm={() => {
          if (deleteConfirmModal) {
            handleDeleteComment(
              deleteConfirmModal.commentId,
              deleteConfirmModal.feedId,
            );
            setDeleteConfirmModal(null);
          }
        }}
        title="Remove Comment"
        message="Are you sure you want to remove this comment?"
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={deleteCommentMutation.isPending}
        loadingText="Removing..."
      />

      <ConfirmModal
        isOpen={!!unrepostConfirmModal}
        onClose={() => setUnrepostConfirmModal(null)}
        onConfirm={() => {
          if (unrepostConfirmModal) {
            handleRepost(unrepostConfirmModal.feedId);
            setUnrepostConfirmModal(null);
          }
        }}
        title="Remove Repost"
        message="Are you sure you want to remove this repost?"
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={repostLoadingId === unrepostConfirmModal?.feedId}
        loadingText="Removing..."
      />

      <ReportDialog
        open={!!reportDialog}
        onClose={() => setReportDialog(null)}
        reportedType={reportDialog?.type ?? "post"}
        reportedId={reportDialog?.id ?? ""}
      />
      {authGateModal}
    </div>
  );
};

export default FeedPostComponent;
