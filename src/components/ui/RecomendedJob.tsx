'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from '@/moduleCss/jobs.module.css'
import mainstyles from '@/_assets/style/style.module.css'
import Image from 'next/image'
import DefaultJobProfile from '../../../public/images/DefaultJobImage.svg'
import { LogoWithFallback } from '../commonUI/InitialAvatar'
import JobLocations from '../commonUI/JobLocations'
import ConfirmModal from '../commonUI/ConfirmModal'
import { useTheme } from '@/context/ThemeContext'
import { getTimeAgoJobListing } from '@/helpers/dateFormatter'

import { toast } from 'react-toastify'
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import {
  saveJob,
  unsaveJob,
  applyJob,
  fetchSavedJobs
} from '@/services/jobs.services'
import { useSearchParams, useRouter } from 'next/navigation'
import LogOutModal from '../commonUI/LogOutModal'
import { useApplyGate } from '@/app/hooks/useApplyGate'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
function RecommendedJobSkeleton () {
  const skeletonBar = (width: string, height: number) => ({
    width,
    height,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.08)',
    animation: 'recJobPulse 1.5s ease-in-out infinite',
  })
  return (
    <div
      style={{
        border: '1px solid rgba(160,174,192,0.5)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ ...skeletonBar('70px', 70), borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={skeletonBar('80%', 14)} />
          <div style={skeletonBar('50%', 12)} />
          <div style={skeletonBar('60%', 12)} />
          <div style={skeletonBar('40%', 10)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
        <div style={{ ...skeletonBar('48%', 36), borderRadius: 20 }} />
        <div style={{ ...skeletonBar('48%', 36), borderRadius: 20 }} />
      </div>
      <style>{`@keyframes recJobPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}

export default function RecomendedJob ({
  filteredTopPicksJobs,
  isLoading = false,
  isAnonymous = false
}: {
  filteredTopPicksJobs: any[]
  isLoading?: boolean
  isAnonymous?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [unsavingJobId, setUnsavingJobId] = useState<string | null>(null)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlSearchQuery = searchParams.get('q') || ''
  const queryClient = useQueryClient()
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [jobToRemove, setJobToRemove] = useState<string | null>(null)

  // Collapse behavior for mobile/tablet. On desktop (≥1024px) the section
  // stays open regardless of isOpen.
  const [isOpen, setIsOpen] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const showContent = isDesktop || isOpen
  const saveJobMutation = useMutation({
    mutationFn: (jobId: string) => saveJob({ id: jobId }),
    onMutate: async jobId => {
      setSavingJobId(jobId)
      await queryClient.cancelQueries({ queryKey: ['saved-jobs'] })

      const previousSavedJobs = queryClient.getQueryData(['saved-jobs'])

      queryClient.setQueryData(['saved-jobs'], (old: any) => {
        if (!old) return old
        const allJobsData = queryClient.getQueryData([
          'jobs',
          { search: urlSearchQuery }
        ]) as any
        const recommendedJobsData = queryClient.getQueryData([
          'recommended-jobs'
        ]) as any

        let jobToAdd = null

        if (allJobsData?.pages) {
          for (const page of allJobsData.pages) {
            const found = page?.data?.result?.find((j: any) => j.id === jobId)
            if (found) {
              jobToAdd = found
              break
            }
          }
        }

        if (!jobToAdd && recommendedJobsData?.pages) {
          for (const page of recommendedJobsData.pages) {
            const found = page?.data?.result?.find((j: any) => j.id === jobId)
            if (found) {
              jobToAdd = found
              break
            }
          }
        }

        if (jobToAdd && old.pages) {
          const newPages = [...old.pages]
          if (newPages[0]?.data?.result) {
            newPages[0] = {
              ...newPages[0],
              data: {
                ...newPages[0].data,
                result: [jobToAdd, ...newPages[0].data.result],
                total_count: (newPages[0].data.total_count || 0) + 1
              }
            }
          }
          return { ...old, pages: newPages }
        }
        return old
      })

      // Optimistically update saved_jobs property in all jobs queries
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 1 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })

      // Also update recommended-jobs query
      queryClient.setQueryData(['recommended-jobs'], (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 1 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })

      return { previousSavedJobs }
    },
    onSuccess: async () => {
      toast.success('Job saved successfully!')
      // Await invalidation before clearing loading state to prevent flash
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['jobs', { tab: 'saved' }] }),
        queryClient.invalidateQueries({ queryKey: ['recommended-jobs-top'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      ])
      setSavingJobId(null)
    },
    onError: (error: any, jobId, context: any) => {
      if (isUnauthenticatedError(error)) openGate('save this job')
      console.error('Failed to save job:', error.message)
      setSavingJobId(null)
      if (context?.previousSavedJobs) {
        queryClient.setQueryData(['saved-jobs'], context.previousSavedJobs)
      }
      // Revert the optimistic updates on error
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 0 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })
      queryClient.setQueryData(['recommended-jobs'], (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 0 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })
    }
  })

  /* ---------------- UNSAVE JOB MUTATION WITH OPTIMISTIC UPDATE ---------------- */
  const unsaveJobMutation = useMutation({
    mutationFn: (jobId: string) => unsaveJob({ id: jobId }),
    onMutate: async jobId => {
      setUnsavingJobId(jobId)
      await queryClient.cancelQueries({ queryKey: ['saved-jobs'] })

      const previousSavedJobs = queryClient.getQueryData(['saved-jobs'])

      queryClient.setQueryData(['saved-jobs'], (old: any) => {
        if (!old?.pages) return old

        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page

          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.filter((job: any) => job.id !== jobId),
              total_count: Math.max(0, (page.data.total_count || 0) - 1)
            }
          }
        })

        return { ...old, pages: newPages }
      })

      // Optimistically update saved_jobs property in all jobs queries
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 0 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })

      // Also update recommended-jobs query
      queryClient.setQueryData(['recommended-jobs'], (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 0 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })

      return { previousSavedJobs }
    },
    onSuccess: async () => {
      // Await invalidation before clearing loading state to prevent flash
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['jobs', { tab: 'saved' }] }),
        queryClient.invalidateQueries({ queryKey: ['recommended-jobs-top'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      ])
      setUnsavingJobId(null)
    },
    onError: (error: any, jobId, context: any) => {
      if (isUnauthenticatedError(error)) openGate('remove this saved job')
      console.error('Failed to unsave job:', error.message)
      setUnsavingJobId(null)
      if (context?.previousSavedJobs) {
        queryClient.setQueryData(['saved-jobs'], context.previousSavedJobs)
      }
      // Revert the optimistic updates on error
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 1 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })
      queryClient.setQueryData(['recommended-jobs'], (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, saved_jobs: 1 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      })
    }
  })
  const applyJobMutation = useMutation({
    mutationFn: (jobId: string) => applyJob({ id: jobId }),
    onMutate: async jobId => {
      setApplyingJobId(jobId)

      // Cancel ongoing fetches only for affected tabs
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['jobs'] }),
        queryClient.cancelQueries({ queryKey: ['applied-jobs'] })
      ])

      // Update applied-jobs query optimistically by adding the job
      queryClient.setQueryData(['applied-jobs'], (old: any) => {
        if (!old) return old
        const allJobsData = queryClient.getQueryData([
          'jobs',
          { search: urlSearchQuery }
        ]) as any
        const recommendedJobsData = queryClient.getQueryData([
          'recommended-jobs'
        ]) as any

        let jobToAdd = null

        if (allJobsData?.pages) {
          for (const page of allJobsData.pages) {
            const found = page?.data?.result?.find((j: any) => j.id === jobId)
            if (found) {
              jobToAdd = { ...found, applied_jobs: 1 }
              break
            }
          }
        }

        if (!jobToAdd && recommendedJobsData?.pages) {
          for (const page of recommendedJobsData.pages) {
            const found = page?.data?.result?.find((j: any) => j.id === jobId)
            if (found) {
              jobToAdd = { ...found, applied_jobs: 1 }
              break
            }
          }
        }

        if (jobToAdd && old.pages) {
          const newPages = [...old.pages]
          if (newPages[0]?.data?.result) {
            newPages[0] = {
              ...newPages[0],
              data: {
                ...newPages[0].data,
                result: [jobToAdd, ...newPages[0].data.result],
                total_count: (newPages[0].data.total_count || 0) + 1
              }
            }
          }
          return { ...old, pages: newPages }
        }
        return old
      })

      // Update jobs query optimistically(29th jan)
      const markAppliedOnly = (old: any) => {
        if (!old?.pages) return old

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              result: page.data.result?.map((job: any) =>
                job.id === jobId ? { ...job, applied_jobs: 1 } : job
              )
            }
          }))
        }
      }

      const updateAppliedFlag = (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any, index: number) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, applied_jobs: 1 } : job
              )
              // Only increment count on first page
              // total_count: index === 0 ? (page.data.total_count || 0) + 1 : page.data.total_count
            }
          }
        })
        return { ...old, pages: newPages }
      }

      // Update applied flag optimistically for all jobs queries
      const jobsQueries = queryClient.getQueriesData({ queryKey: ['jobs'] })
      jobsQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData(queryKey, updateAppliedFlag)
        }
      })

      // queryClient.setQueryData(['applied-jobs'], updateAppliedFlag)
      // queryClient.setQueryData(['recommended-jobs'], updateAppliedFlag)
      // queryClient.setQueryData(['recommended-jobs-top'], updateAppliedFlag)

      // Mark applied flag ONLY (no count change) (29th jan)
      queryClient.setQueriesData({ queryKey: ['jobs'] }, markAppliedOnly)
      queryClient.setQueryData(['recommended-jobs'], markAppliedOnly)
      // queryClient.setQueryData(["recommended-jobs-top"], markAppliedOnly);

      queryClient.setQueryData(
        ['recommended-jobs-top', { limit: 3, page: 1 }],
        (old: any) => {
          if (!old?.data?.result) return old
          return {
            ...old,
            data: {
              ...old.data,
              result: old.data.result.map((job: any) =>
                job.id === jobId ? { ...job, applied_jobs: 1 } : job
              )
            }
          }
        }
      )

      return { jobId }
    },
    onSuccess: () => {
      toast.success('Job applied successfully!')
      setApplyingJobId(null)
      // Only refetch applied jobs tab
      queryClient.invalidateQueries({ queryKey: ['jobs', { tab: 'applied' }] })
      queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      // toast.success("Job application submitted successfully!");
    },
    onError: (error: any, jobId) => {
      if (isUnauthenticatedError(error)) openGate('apply for this job')
      setApplyingJobId(null)
      // Revert optimistic updates
      const revertAppliedFlag = (old: any) => {
        if (!old?.pages) return old
        const newPages = old.pages.map((page: any) => {
          if (!page?.data?.result) return page
          return {
            ...page,
            data: {
              ...page.data,
              result: page.data.result.map((job: any) =>
                job.id === jobId ? { ...job, applied_jobs: 0 } : job
              )
            }
          }
        })
        return { ...old, pages: newPages }
      }

      const jobsQueries = queryClient.getQueriesData({ queryKey: ['jobs'] })
      jobsQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData(queryKey, revertAppliedFlag)
        }
      })

      queryClient.setQueryData(['applied-jobs'], revertAppliedFlag)
      queryClient.setQueryData(['recommended-jobs'], revertAppliedFlag)
      // queryClient.setQueryData(["recommended-jobs-top"], revertAppliedFlag);

      queryClient.setQueryData(
        ['recommended-jobs-top', { limit: 3, page: 1 }],
        (old: any) => {
          if (!old?.data?.result) return old
          return {
            ...old,
            data: {
              ...old.data,
              result: old.data.result.map((job: any) =>
                job.id === jobId ? { ...job, applied_jobs: 0 } : job
              )
            }
          }
        }
      )

      toast.error(`Failed to apply for job: ${error.message}`)
    }
  })
  const {
    data: savedData,
    isLoading: savedLoading,
    hasNextPage: savedHasNextPage,
    fetchNextPage: savedFetchNextPage,
    isFetchingNextPage: savedIsFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['saved-jobs'],
    queryFn: ({ pageParam = 1 }) =>
      fetchSavedJobs({ limit: 10, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length
      const totalCount = lastPage?.data?.total_count || 0
      const totalPages = Math.ceil(totalCount / 10)
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1,
    // Anonymous visitors can't have saved jobs — skip the auth-only request.
    enabled: !isAnonymous
  })
  const savedJobIds = useMemo(() => {
    const ids = new Set<string>()
    if (savedData?.pages) {
      savedData.pages.forEach(page => {
        ;(page?.data?.result || []).forEach((job: any) => {
          ids.add(job.id)
        })
      })
    }
    return ids
  }, [savedData])

  // Helper to optimistically mark a job as applied across all query caches
  const markJobAsAppliedOptimistically = (jobId: string) => {
    const markAppliedOnly = (old: any) => {
      if (!old?.pages) return old
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            result: page.data.result?.map((job: any) =>
              job.id === jobId ? { ...job, applied_jobs: 1 } : job
            )
          }
        }))
      }
    }

    // Update all jobs queries
    queryClient.setQueriesData({ queryKey: ['jobs'] }, markAppliedOnly)
    queryClient.setQueryData(['recommended-jobs'], markAppliedOnly)

    // Update recommended-jobs-top
    queryClient.setQueryData(
      ['recommended-jobs-top', { limit: 3, page: 1 }],
      (old: any) => {
        if (!old?.data?.result) return old
        return {
          ...old,
          data: {
            ...old.data,
            result: old.data.result.map((job: any) =>
              job.id === jobId ? { ...job, applied_jobs: 1 } : job
            )
          }
        }
      }
    )
  }

  // CV gate now lives on the Job Details page (where applying happens). The
  // modal is kept mounted but is no longer triggered from Recommended Jobs.
  const { gateModal: applyGateModal } = useApplyGate()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const handleApplyJob = (job: any) => {
    if (job?.applied_jobs == 1) return
    // Applying now happens only on a job's own Details page. From Recommended
    // Jobs we just open that page; the CV gate + apply live inside Job Details.
    router.push(`/jobs/${job.id}`)
  }

  // Single source of truth for a job's saved state. Combines the loaded
  // saved-jobs ids with the per-job `saved_jobs` flag so the button label and
  // the click handler can never disagree (e.g. when a saved job isn't on the
  // first loaded page of saved-jobs).
  const isJobSaved = (job: any) =>
    savedJobIds.has(job.id) || job?.saved_jobs == 1

  const handleSaveJob = (job: any) => {
    ensureAuthed('save this job', () => {
      if (isJobSaved(job)) {
        // OPEN CONFIRM MODAL
        setJobToRemove(job.id)
        setShowRemoveModal(true)
      } else {
        saveJobMutation.mutate(job.id)
      }
    })
  }
  const confirmRemoveJob = () => {
    if (!jobToRemove) return

    unsaveJobMutation.mutate(jobToRemove)

    setShowRemoveModal(false)
    setJobToRemove(null)
  }

  const cancelRemoveJob = () => {
    setShowRemoveModal(false)
    setJobToRemove(null)
  }

  return (
    <>
      <div className={styles.side_recomended_job} style={isLoading ? { overflowY: 'hidden' } : undefined}>
        <h4
          className='font-semibold mb-4 flex items-center justify-between lg:cursor-default'
          style={{
            ...(isLight ? { color: '#040F1F' } : {}),
            cursor: isDesktop ? 'default' : 'pointer',
          }}
          onClick={() => {
            if (!isDesktop) setIsOpen(prev => !prev)
          }}
        >
          <span>Recommended Jobs</span>
          {!isDesktop && (
            <ChevronDown
              size={18}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </h4>
        {/* Recommendations are public now — always render the list (the
            `false` keeps the old sign-in prompt available if ever needed).
            `isAnonymous` still gates the saved-jobs lookup above. */}
        {showContent && (false ? (
          <div
            style={{
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width={30}
              height={30}
              viewBox='0 0 130 130'
              fill='none'
            >
              <path
                d='M125.938 44.6875C125.933 40.3792 124.219 36.2487 121.173 33.2022C118.126 30.1558 113.996 28.4422 109.688 28.4375H97.5V24.375C97.4966 21.1437 96.2115 18.0457 93.9267 15.7608C91.6418 13.476 88.5438 12.1909 85.3125 12.1875H44.6875C41.4562 12.1909 38.3582 13.476 36.0733 15.7608C33.7885 18.0457 32.5034 21.1437 32.5 24.375V28.4375H20.3125C16.0042 28.4422 11.8737 30.1558 8.82721 33.2022C5.78076 36.2487 4.0672 40.3792 4.0625 44.6875V56.875H125.938V44.6875ZM89.375 28.4375H40.625V24.375C40.625 23.2976 41.053 22.2642 41.8149 21.5024C42.5767 20.7405 43.6101 20.3125 44.6875 20.3125H85.3125C86.3899 20.3125 87.4233 20.7405 88.1851 21.5024C88.947 22.2642 89.375 23.2976 89.375 24.375V28.4375ZM85.3125 67.0312C85.3125 68.6474 84.6705 70.1974 83.5277 71.3402C82.3849 72.483 80.8349 73.125 79.2188 73.125H50.7812C49.1651 73.125 47.6151 72.483 46.4723 71.3402C45.3295 70.1974 44.6875 68.6474 44.6875 67.0312V66.0156C44.6875 65.7463 44.5805 65.4879 44.39 65.2975C44.1996 65.107 43.9412 65 43.6719 65H4.0625V101.562C4.0625 105.872 5.77455 110.006 8.82201 113.053C11.8695 116.1 16.0027 117.812 20.3125 117.812H109.688C113.997 117.812 118.131 116.1 121.178 113.053C124.225 110.006 125.938 105.872 125.938 101.562V65H86.3281C86.0588 65 85.8004 65.107 85.61 65.2975C85.4195 65.4879 85.3125 65.7463 85.3125 66.0156V67.0312Z'
                fill={isLight ? '#888' : '#A0A0A0'}
              />
            </svg>
            <p
              className='text-sm'
              style={{ color: isLight ? '#475569' : '#A0AEC0', margin: 0 }}
            >
              Sign in to see recommended jobs  based on your skills.
            </p>
          </div>
        ) : isLoading ? (
          <div style={{ marginTop: 15 }}>
            {[1, 2, 3].map(i => <RecommendedJobSkeleton key={i} />)}
          </div>
        ) : filteredTopPicksJobs?.length === 0 ? (
          <p
            className='text-sm text-slate-400'
            style={isLight ? { color: '#888888' } : undefined}
          >
            No recommended jobs found.
          </p>
        ) : (
          <div className={styles.side_recomended_job_list_wrapper}>
            {filteredTopPicksJobs.map((job: any) => (
              <div
                key={job.id}
                className={`${styles.side_recomended_job_item} card-hover`}
                onClick={() => router.push(`/jobs/${job.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.side_recomended_job_information}>
                  <div className={styles.side_recomended_job_item_logo}>
                    <LogoWithFallback
                      src={job?.company_color_url || job?.company_logo_url}
                      name={job?.company_name || job?.title || ''}
                      size={64}
                      borderRadius={14}
                      alt={`Company Logo`}
                      imgClassName={styles.side_recomended_job_item_logo_img}
                    />
                  </div>
                  <div className={`${styles.side_recomended_job_item_info} flex-1 min-w-0`}>
                    <p
                      className={styles.side_recomended_job_item_info_title}
                      style={isLight ? { color: '#040F1F' } : undefined}
                    >
                      {job.title}
                    </p>
                    <p
                      className={styles.side_recomended_job_item_info_company}
                      style={isLight ? { color: '#888888' } : undefined}
                    >
                      <span><svg
                                    className={styles.jobListing_job_item_company_icon}
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    aria-hidden='true'
                                  >
                                    <path d='M3 21h18' />
                                    <path d='M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16' />
                                    <path d='M16 21V9h3a2 2 0 0 1 2 2v10' />
                                    <path d='M8 7h2M8 11h2M8 15h2' />
                                  </svg></span>
                      {job.company_name}
                    </p>

                    {job.location?.length ? (
                      <JobLocations
                        locations={job.location}
                        isLight={isLight}
                        title={job.title}
                      />
                    ) : null}
                    {job.created_at && (
                      <p
                        className='text-[12px] text-[#A0AEC0]'
                        style={isLight ? { color: '#888' } : {}}
                      >
                        Posted {getTimeAgoJobListing(job.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className={styles.side_recomended_job_item_btns}>
                  {job?.applied_jobs != 1 ? (
                    <button
                      className={
                        isLight
                          ? 'light-apply-btn'
                          : `${mainstyles.jobDetails_job_item_btns} btn-gradient`
                      }
                      onClick={e => {
                        e.stopPropagation()
                        handleApplyJob(job)
                      }}
                    >
                      View Job
                    </button>
                  ) : (
                    <button
                      className={
                        isLight
                          ? 'light-applied-btn'
                          : `${mainstyles.jobDetails_job_item_btns} btn-gradient apply-btn`
                      }
                      disabled={true}
                    >
                      Applied
                    </button>
                  )}

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleSaveJob(job)
                    }}
                    disabled={
                      savingJobId === job.id || unsavingJobId === job.id
                    }
                    className={`${
                      isLight
                        ? 'light-save-btn'
                        : `${mainstyles.jobDetails_job_item_btns} social-media-btn gradient-border-btn`
                    } ${isJobSaved(job) ? styles.activeactive : ''}`}
                  >
                    {savingJobId === job.id
                      ? 'Saving...'
                      : unsavingJobId === job.id
                      ? 'Unsaving...'
                      : isJobSaved(job)
                      ? 'Saved Job'
                      : 'Save Job'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={cancelRemoveJob}
        onConfirm={confirmRemoveJob}
        title='Remove Saved Job?'
        message='Are you sure you want to remove this job from your saved list?'
        confirmText='Yes, Remove'
        cancelText='No'
      />
      {applyGateModal}
      {authGateModal}
    </>
  )
}
