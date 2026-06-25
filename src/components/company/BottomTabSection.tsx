import * as React from 'react'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'

import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'

import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import companystyles from '@/moduleCss/comapnyDetails.module.css'
import JobStyles from '@/moduleCss/jobDetails.module.css'
import {
  fetchCompanyJobs,
  saveJob,
  unsaveJob,
  applyJob
} from '@/services/jobs.services'
import DefaultJobProfile from '../../../public/images/DefaultJobImage.svg'
import { LogoWithFallback } from '../commonUI/InitialAvatar'
import JobLocations from '../commonUI/JobLocations'
import LogOutModal from '../commonUI/LogOutModal'
import { useRouter } from 'next/navigation'
import { ensureValidToken } from '@/lib/tokenManager'
import ConfirmModal from '../commonUI/ConfirmModal'
import { useApplyGate } from '@/app/hooks/useApplyGate'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import { useTheme } from '@/context/ThemeContext'
import { useListingPreserve } from '@/app/hooks/useListingPreserve'
import { useListingState } from '@/app/hooks/useListingState'

// --------------------
// TYPES
// --------------------
interface CompanyJob {
  company_id: any
  id: string
  title: string
  company_name: string
  company_logo_url?: string
  saved_jobs?: '0' | '1'
  applied_jobs?: '0' | '1'
  location?: any[]
  // FIX: added job_link to type so it can be accessed in handleCompanyJobApply
  job_link?: string
  company_color_url?: string
  created_at?: string
}

interface JobState {
  saved_jobs: '0' | '1'
  applied_jobs: '0' | '1'
}

// --------------------
// CONSTANTS
// --------------------
const JOBS_PER_PAGE = 50
const INITIAL_VISIBLE = 4
const LOAD_MORE_COUNT = 4

// --------------------
// COMPONENT
// --------------------
// Same time-ago format used in FeedPostComponent
const getTimeAgo = (date: string) => {
  const now = Date.now()
  const past = new Date(date).getTime()
  const diffInSeconds = Math.floor((now - past) / 1000)

  if (diffInSeconds < 60) {
    return 'now'
  }

  const minutes = Math.floor(diffInSeconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days === 1) {
    return '1d ago'
  }
  if (days < 7) {
    return `${days}d ago`
  }

  const weeks = Math.floor(days / 7)
  if (days < 30) {
    return weeks === 1 ? '1w ago' : `${weeks}w ago`
  }

  const months = Math.floor(days / 30)
  if (months === 1) {
    return '1mo ago'
  }
  if (months < 12) {
    return `${months}mo ago`
  }

  const years = Math.floor(months / 12)
  if (years === 1) {
    return '1y ago'
  }

  return `${years}y ago`
}

type BottomTabSectionProps = {
  companyId: string
  companyName?: string
  created_at?: string
}

const BottomTabSection = ({
  companyId,
  companyName: companyNameProp,
  created_at: createdAtProp
}: BottomTabSectionProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [value, setValue] = React.useState('1')
  const [companyJobsPage] = React.useState(1)

  // Persist how many jobs the user had visible (infinite-scroll position)
  // and the inner scroll-container offset, keyed per company. Restores
  // exactly when user navigates Company-Details → Job/User-Details → back.
  const preserveKey = `company-${companyId}`
  const { saveBeforeNavigate, setScrollContainer } =
    useListingPreserve(preserveKey)
  const [persisted, setPersisted] = useListingState(preserveKey, {
    visibleCount: INITIAL_VISIBLE
  })
  const [visibleCount, setVisibleCount] = React.useState(persisted.visibleCount)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setPersisted({ visibleCount })
  }, [visibleCount, setPersisted])

  const [showRemoveModal, setShowRemoveModal] = React.useState(false)
  const [jobToRemove, setJobToRemove] = React.useState<string | null>(null)

  // ==================== LOCAL STATE ====================
  const [savingJobIds, setSavingJobIds] = React.useState<Set<string>>(new Set())
  const [unsavingJobIds, setUnsavingJobIds] = React.useState<Set<string>>(
    new Set()
  )
  const [applyingJobIds, setApplyingJobIds] = React.useState<Set<string>>(
    new Set()
  )
  const router = useRouter()
  // Store optimistic state for jobs
  const [jobsState, setJobsState] = React.useState<Record<string, JobState>>({})

  // Query client for React Query
  const queryClient = useQueryClient()

  // Use the companyId prop
  const job = {
    data: {
      company_id: companyId
    }
  }

  const hasMoreJobs = true

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  // ==================== FETCH COMPANY JOBS ====================
  const {
    data: companyJobsData,
    isLoading: companyJobsLoading,
    isError: companyJobsError,
    error: companyJobsErrorDetails
  } = useQuery({
    queryKey: ['company-jobs', job?.data?.company_id, companyJobsPage],
    queryFn: () =>
      fetchCompanyJobs({
        limit: JOBS_PER_PAGE,
        page: companyJobsPage,
        id: job?.data?.company_id || ''
      }),
    enabled: value === '1' && !!job?.data?.company_id && hasMoreJobs
  })

  // ==================== DERIVED DATA ====================
  const companyJobs: CompanyJob[] = companyJobsData?.jobs ?? []
  const visibleJobs = companyJobs.slice(0, visibleCount)
  const hasMoreToShow = visibleCount < companyJobs.length
  console.log(companyJobsData, 'Company details')

  // ==================== INFINITE SCROLL ====================
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev =>
            Math.min(prev + LOAD_MORE_COUNT, companyJobs.length)
          )
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [companyJobs.length])

  // ==================== HELPER FUNCTION ====================
  const getJobState = (companyJob: CompanyJob): JobState => {
    if (jobsState[companyJob.id]) {
      return jobsState[companyJob.id]
    }
    return {
      saved_jobs: companyJob.saved_jobs || '0',
      applied_jobs: companyJob.applied_jobs || '0'
    }
  }

  // ==================== QUERY KEY (shared by all mutations) ====================
  const companyJobsQueryKey = ['company-jobs', companyId, companyJobsPage]

  // ==================== SAVE JOB MUTATION ====================
  const saveJobMutation = useMutation({
    // FIX: Added ensureValidToken (was missing, inconsistent with unsave/apply)

    mutationFn: async (jobId: string) => {
      await ensureValidToken()
      return saveJob({ id: jobId })
    },

    onMutate: async (jobId: string) => {
      setSavingJobIds(prev => new Set(prev).add(jobId))

      await queryClient.cancelQueries({
        queryKey: companyJobsQueryKey
      })

      const previousData = queryClient.getQueryData<any>(companyJobsQueryKey)

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs: '1',
            applied_jobs:
              prev[jobId]?.applied_jobs ?? existingJob?.applied_jobs ?? '0'
          }
        }
      })

      queryClient.setQueryData(companyJobsQueryKey, (old: any) => {
        if (!old?.jobs) return old
        return {
          ...old,
          jobs: old.jobs.map((j: any) =>
            j.id === jobId ? { ...j, saved_jobs: '1' } : j
          )
        }
      })

      return { previousData, jobId }
    },

    onSuccess: (_, jobId) => {
      setSavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      toast.success('Job saved successfully!')

      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      queryClient.invalidateQueries({ queryKey: companyJobsQueryKey })
    },

    onError: (error: any, jobId, context: any) => {
      if (isUnauthenticatedError(error)) openGate('save this job')
      setSavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs: '0',
            applied_jobs:
              prev[jobId]?.applied_jobs ?? existingJob?.applied_jobs ?? '0'
          }
        }
      })

      if (context?.previousData) {
        queryClient.setQueryData(companyJobsQueryKey, context.previousData)
      }

      toast.error('Failed to save job')
      console.error('Save job error:', error.message)
    }
  })

  // ==================== UNSAVE JOB MUTATION ====================
  const unsaveJobMutation = useMutation({
    // FIX: Added ensureValidToken for consistency
    mutationFn: async (jobId: string) => {
      await ensureValidToken()
      return unsaveJob({ id: jobId })
    },

    onMutate: async (jobId: string) => {
      setUnsavingJobIds(prev => new Set(prev).add(jobId))

      await queryClient.cancelQueries({
        queryKey: companyJobsQueryKey
      })

      const previousData = queryClient.getQueryData<any>(companyJobsQueryKey)

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs: '0',
            applied_jobs:
              prev[jobId]?.applied_jobs ?? existingJob?.applied_jobs ?? '0'
          }
        }
      })

      queryClient.setQueryData(companyJobsQueryKey, (old: any) => {
        if (!old?.jobs) return old
        return {
          ...old,
          jobs: old.jobs.map((j: any) =>
            j.id === jobId ? { ...j, saved_jobs: '0' } : j
          )
        }
      })

      return { previousData, jobId }
    },

    onSuccess: (_, jobId) => {
      setUnsavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      toast.success('Removed from saved')

      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      queryClient.invalidateQueries({ queryKey: companyJobsQueryKey })
    },

    onError: (error: any, jobId, context: any) => {
      if (isUnauthenticatedError(error)) openGate('remove this saved job')
      setUnsavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs: '1',
            applied_jobs:
              prev[jobId]?.applied_jobs ?? existingJob?.applied_jobs ?? '0'
          }
        }
      })

      if (context?.previousData) {
        queryClient.setQueryData(companyJobsQueryKey, context.previousData)
      }

      toast.error('Failed to unsave job')
      console.error('Unsave job error:', error.message)
    }
  })

  // ==================== APPLY JOB MUTATION ====================
  const applyJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await ensureValidToken()
      return applyJob({ id: jobId })
    },

    onMutate: async (jobId: string) => {
      setApplyingJobIds(prev => new Set(prev).add(jobId))

      await queryClient.cancelQueries({
        queryKey: companyJobsQueryKey
      })

      const previousData = queryClient.getQueryData<any>(companyJobsQueryKey)

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs:
              prev[jobId]?.saved_jobs ?? existingJob?.saved_jobs ?? '0',
            applied_jobs: '1'
          }
        }
      })

      queryClient.setQueryData(companyJobsQueryKey, (old: any) => {
        if (!old?.jobs) return old
        return {
          ...old,
          jobs: old.jobs.map((j: any) =>
            j.id === jobId ? { ...j, applied_jobs: '1' } : j
          )
        }
      })

      return { previousData, jobId }
    },

    onSuccess: (_, jobId) => {
      setApplyingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      toast.success('Job applied successfully!')

      queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      queryClient.invalidateQueries({ queryKey: companyJobsQueryKey })
    },

    onError: (error: any, jobId, context: any) => {
      if (isUnauthenticatedError(error)) openGate('apply for this job')
      setApplyingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      setJobsState(prev => {
        const existingJob = companyJobs.find(j => j.id === jobId)
        return {
          ...prev,
          [jobId]: {
            saved_jobs:
              prev[jobId]?.saved_jobs ?? existingJob?.saved_jobs ?? '0',
            applied_jobs: '0'
          }
        }
      })

      if (context?.previousData) {
        queryClient.setQueryData(companyJobsQueryKey, context.previousData)
      }

      toast.error('Failed to apply for job')
      console.error('Apply job error:', error.message)
    }
  })

  // ==================== EVENT HANDLERS ====================
  const handleJobClick = (job: CompanyJob) => {
    console.log('Job clicked:', job)
  }

  const handleCompanyJobSave = (jobId: string) => {
    ensureAuthed('save this job', () => {
      const currentState = getJobState(
        companyJobs.find(j => j.id === jobId) || ({ id: jobId } as CompanyJob)
      )

      if (currentState.saved_jobs === '1') {
        setJobToRemove(jobId)
        setShowRemoveModal(true)
      } else {
        saveJobMutation.mutate(jobId)
      }
    })
  }

  // CV gate now lives on the Job Details page (where applying happens). The
  // modal is kept mounted but is no longer triggered from the company page.
  const { gateModal: applyGateModal } = useApplyGate()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  // Applying is only allowed from a job's own Details page now, so this opens
  // that page; the CV gate + apply live inside Job Details.
  const handleCompanyJobApply = (companyJob: CompanyJob) => {
    if (!companyJob?.id) return
    router.push(`/jobs/${companyJob.id}`)
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

  // FIX: Fall back to the prop when there are no jobs (empty jobs array has no company_name)
  const companyName =
    companyJobsData?.jobs?.[0]?.company_name || companyNameProp || ''

  // ==================== RENDER ====================
  if (
    !companyJobsLoading &&
    (!companyJobsData?.count || companyJobsData.count === 0)
  )
    return null

  return (
    <div
      id='opportunities-section'
      className={companystyles.company_bottom_tab_section}
    >
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList
              className={companystyles.company_bottom_tab_box}
              onChange={handleChange}
            >
              <Tab
                label={`Jobs at ${companyName} (${
                  companyJobsData?.count || 0
                })`}
                value='1'
                className={companystyles.company_bottom_tab_name}
              />
            </TabList>
          </Box>

          {/* ============ TAB 1 ============ */}
          <TabPanel
            value='1'
            className={companystyles.company_other_oppurtunities}
          >
            <div className={companystyles.company_other_oppurtunities_inner}>
              <div
                className={`${JobStyles.jobListing_more_jobs_card_wrapper} scrollbar-hide`}
                style={{ overflowX: 'hidden', overflowY: 'auto' }}
                ref={setScrollContainer}
              >
                {companyJobsError && (
                  <div className='text-center py-8 text-red-500'>
                    Failed to load jobs
                  </div>
                )}

                {!companyJobsLoading && companyJobs.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-400'>No jobs available</p>
                  </div>
                )}

                <div className={companystyles.jobListing_more_jobs_cards}>
                  {visibleJobs.map(companyJob => {
                    const jobState = getJobState(companyJob)
                    const isSaving = savingJobIds.has(companyJob.id)
                    const isUnsaving = unsavingJobIds.has(companyJob.id)
                    const isApplying = applyingJobIds.has(companyJob.id)

                    return (
                      <div key={companyJob.id} className='col-lg-6'>
                        <div
                          className={`${JobStyles.jobListing_more_jobs_card} card-hover cursor-pointer`}
                          onClick={() => {
                            handleJobClick(companyJob)
                            saveBeforeNavigate()
                            router.push(`/jobs/${companyJob.id}`)
                          }}
                          style={{ position: 'relative' }}
                        >
                          {companyJob.created_at && (
                            <span className={JobStyles.jobDetails_posted_chip}>
                              <svg
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                aria-hidden='true'
                              >
                                <circle cx='12' cy='12' r='9' />
                                <path d='M12 7v5l3 2' />
                              </svg>
                              {getTimeAgo(companyJob.created_at)}
                            </span>
                          )}
                          <div
                            className='flex items-center gap-4'
                            style={{ flex: 1 }}
                          >
                            <div
                              className={
                                JobStyles.jobDetails_job_company_card_logo
                              }
                              onClick={() => {
                                saveBeforeNavigate()
                                router.push(`/company/${companyJob.id}`)
                              }}
                            >
                              <LogoWithFallback
                                src={companyJob.company_logo_url}
                                name={companyJob.company_name || companyJob.title || ''}
                                size={70}
                                borderRadius={12}
                                alt='logo'
                              />
                            </div>

                            <div
                              className={JobStyles.jobDetails_job_item_info}
                              style={{ minWidth: 0, flex: 1 }}
                            >
                              <h2
                                className={
                                  JobStyles.jobDetails_job_item_company
                                }
                                style={{
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  // clear the absolutely-positioned timestamp
                                  // chip so a long title never runs under it
                                  paddingRight: 96,
                                }}
                              >
                                {companyJob.title}
                              </h2>

                              <p
                                className={
                                  JobStyles.jobDetails_job_item_description
                                }
                                onClick={e => {
                                  e.stopPropagation()
                                  router.push(
                                    `/company/${companyJob.company_id}`
                                  )
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <svg
                                  width='14'
                                  height='14'
                                  viewBox='0 0 24 24'
                                  fill='none'
                                  stroke='currentColor'
                                  strokeWidth='1.8'
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  style={{ flexShrink: 0, opacity: 0.85 }}
                                  aria-hidden='true'
                                >
                                  <path d='M3 21h18' />
                                  <path d='M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16' />
                                  <path d='M16 21V9h3a2 2 0 0 1 2 2v10' />
                                  <path d='M8 7h2M8 11h2M8 15h2' />
                                </svg>
                                <span>{companyJob.company_name}</span>
                              </p>

                              {companyJob.location?.length ? (
                                <JobLocations
                                  locations={companyJob.location}
                                  isLight={isLight}
                                  title={companyJob.title}
                                />
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={JobStyles.jobListing_more_jobs_card_btns}
                          >
                            {/* ======== APPLY BUTTON ======== */}
                            <button
                              className={
                                isLight
                                  ? jobState.applied_jobs === '1'
                                    ? 'light-applied-btn width-auto-css w-full'
                                    : 'light-apply-btn width-auto-css w-full'
                                  : `${
                                      JobStyles.jobListing_more_jobs_card_btn
                                    } btn-gradient cursor-pointer ${
                                      jobState.applied_jobs === '1'
                                        ? 'apply-btn'
                                        : ''
                                    }`
                              }
                              onClick={e => {
                                e.stopPropagation()
                                handleCompanyJobApply(companyJob)
                              }}
                              disabled={
                                isApplying || jobState.applied_jobs === '1'
                              }
                              aria-label={
                                jobState.applied_jobs === '1'
                                  ? 'Already applied'
                                  : 'View job details'
                              }
                            >
                              <span>
                                {isApplying
                                  ? 'Applying...'
                                  : jobState.applied_jobs === '1'
                                  ? 'Applied Job'
                                  : 'View Job'}
                              </span>
                            </button>
                            {/* ======== SAVE BUTTON ======== */}
                            <button
                              className={
                                isLight
                                  ? 'light-save-btn width-auto-css w-full'
                                  : `${JobStyles.jobListing_more_jobs_card_btn} social-media-btn gradient-border-btn`
                              }
                              onClick={e => {
                                e.stopPropagation()
                                handleCompanyJobSave(companyJob.id)
                              }}
                              disabled={isSaving || isUnsaving}
                              aria-label={
                                jobState.saved_jobs === '1'
                                  ? 'Remove from saved'
                                  : 'Save job'
                              }
                            >
                              <span className={isLight ? '' : 'text-white'}>
                                {isSaving
                                  ? 'Saving...'
                                  : isUnsaving
                                  ? 'Removing...'
                                  : jobState.saved_jobs === '1'
                                  ? 'Saved Job'
                                  : 'Save Job'}
                              </span>
                            </button>

                            {/* FIX: Pass full companyJob object so job_link can be accessed */}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasMoreToShow && (
                  <div
                    ref={sentinelRef}
                    className='flex items-center justify-center py-6'
                  >
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500' />
                  </div>
                )}

                {companyJobsLoading && (
                  <div className='flex items-center justify-center py-6'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500' />
                  </div>
                )}
              </div>
            </div>
          </TabPanel>
        </TabContext>
      </Box>

      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={cancelRemoveJob}
        title='Remove saved job?'
        message='Are you sure you want to remove this job from your saved list?'
        onConfirm={confirmRemoveJob}
        confirmText='Yes, Remove'
        cancelText='No'
      />
      {applyGateModal}
      {authGateModal}
    </div>
  )
}

export default BottomTabSection
