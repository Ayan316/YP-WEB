'use client'
import { MapPin, Info, User, Bookmark } from 'lucide-react'
import BuildingIcon from '@/_assets/icons/header_icons/clarity_building-solid.svg'
import styles from '../../moduleCss/jobDetails.module.css'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import UserDefaultImg from '../../../public/profile/userProfile_image.png'
import DefaultJobProfile from '../../../public/images/DefaultJobImage.svg'
import { LogoWithFallback } from '../commonUI/InitialAvatar'
import JobLocations from '../commonUI/JobLocations'
import { useState, useEffect, useRef, useCallback, useMemo, Key } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTimeAgo } from '@/helpers/getTimeAgo'
import { getTimeAgoJobListing } from '@/helpers/dateFormatter'
import ProfileImagePreview from '../commonUI/ProfileImagePreview'
import Link from 'next/link'
import {
  fetchJobDetails,
  saveJob,
  unsaveJob,
  applyJob,
  fetchSimilarJobs
} from '@/services/jobs.services'
import { GlobalSpinner } from '../commonUI/loaders/spinners/GlobalSpinner'
import LogOutModal from '../commonUI/LogOutModal'
import { ensureValidToken } from '@/lib/tokenManager'
import { RenderHtmlContent } from '../commonUI/RenderHTMLContent'
import CompanyCoverImageSkeleton from '../commonUI/loaders/skeletons/CompanyCoverImageSkeleton'
import JobCoverImage from './JobCoverImage'
import CompanyInfoSkeleton from '../commonUI/loaders/skeletons/CompanyInfoSkeleton'
import CompanyKeywordsSkeleton from '../commonUI/loaders/skeletons/CompanyKeywordsSkeleton'
import AboutCompanySkeleton from '../commonUI/loaders/skeletons/AboutCompanySkeleton'
import BottomTabSectionSkeleton from '../commonUI/loaders/skeletons/BottomTabSectionSkeleton'
import ConfirmModal from '../commonUI/ConfirmModal'
import { useApplyGate } from '@/app/hooks/useApplyGate'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { useTheme } from '@/context/ThemeContext'
import jobstyles from '../../moduleCss/jobs.module.css'

type Props = {
  jobId: string
}

export default function JobDetails ({ jobId }: Props) {
  console.log('JOB ID:', jobId)

  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [jobToRemove, setJobToRemove] = useState<string | null>(null)

  const router = useRouter()
  const queryClient = useQueryClient()
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const [companyJobsPage, setCompanyJobsPage] = useState(1)
  const [allCompanyJobs, setAllCompanyJobs] = useState<any[]>([])
  const [hasMoreJobs, setHasMoreJobs] = useState(true)
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set())
  const [unsavingJobIds, setUnsavingJobIds] = useState<Set<string>>(new Set())
  const [applyingJobIds, setApplyingJobIds] = useState<Set<string>>(new Set())
  const [jobRoleModalOpen, setJobRoleModalOpen] = useState(false)
  // Position the Job Role tooltip via a portal so it isn't clipped by the
  // surrounding `overflow-y: auto` scroll container.
  const jobRoleTriggerRef = useRef<HTMLSpanElement | null>(null)
  const [jobRoleTooltipPos, setJobRoleTooltipPos] = useState<{
    top: number
    left: number
  } | null>(null)
  const openJobRoleTooltip = () => {
    const rect = jobRoleTriggerRef.current?.getBoundingClientRect()
    if (rect) {
      // Anchor above the icon; tooltip itself is translated up via transform.
      setJobRoleTooltipPos({ top: rect.top, left: rect.left })
    }
    setJobRoleModalOpen(true)
  }
  const closeJobRoleTooltip = () => setJobRoleModalOpen(false)
  const [applyConfirmModal, setApplyConfirmModal] = useState<{
    jobId: string
    title: string
  } | null>(null)

  const companyJobsContainerRef = useRef<HTMLDivElement>(null)
  const JOBS_PER_PAGE = 4

  const {
    data: job,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['job-details', jobId],
    queryFn: () => fetchJobDetails({ id: jobId }),
    enabled: !!jobId
  })

  useEffect(() => {
    setAllCompanyJobs([])
    setCompanyJobsPage(1)
    setHasMoreJobs(true)
  }, [job?.data?.id])

  console.log('Job details from job details page: ', job)
  console.log('Company id from job details page: ', job?.data?.company_id)
  console.log('Current job id from job details page: ', job?.data?.id)

  // Fetch similar jobs with pagination
  const {
    data: companyJobsData,
    isLoading: companyJobsLoading,
    isError: companyJobsError
  } = useQuery({
    queryKey: ['similar-jobs', job?.data?.id, companyJobsPage],
    queryFn: () =>
      fetchSimilarJobs({
        limit: JOBS_PER_PAGE,
        page: companyJobsPage,
        id: job?.data?.id || ''
      }),
    enabled: !!job?.data?.id && hasMoreJobs
  })

  console.log('Similar jobs from job details page: ', companyJobsData)

  useEffect(() => {
    if (companyJobsData?.jobs) {
      const newJobs = companyJobsData.jobs

      setAllCompanyJobs(prev => {
        const existingIds = new Set(prev.map(job => job.id))
        const uniqueNewJobs = newJobs.filter(
          (job: any) => !existingIds.has(job.id)
        )

        if (uniqueNewJobs.length === 0) return prev
        return [...prev, ...uniqueNewJobs]
      })

      if (newJobs.length < JOBS_PER_PAGE) {
        setHasMoreJobs(false)
      }
    }
  }, [companyJobsData])

  // Deduplicate before rendering
  const uniqueCompanyJobs = useMemo(() => {
    const seen = new Set<string>()
    return allCompanyJobs.filter(job => {
      if (seen.has(job.id) || job.id === jobId) return false
      seen.add(job.id)
      return true
    })
  }, [allCompanyJobs, jobId])

  console.log('Unique similar jobs from job details page: ', uniqueCompanyJobs)

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!companyJobsContainerRef.current || !hasMoreJobs || companyJobsLoading)
      return

    const { scrollTop, scrollHeight, clientHeight } =
      companyJobsContainerRef.current

    if (scrollHeight - (scrollTop + clientHeight) < 200) {
      setCompanyJobsPage(prev => prev + 1)
    }
  }, [hasMoreJobs, companyJobsLoading])

  useEffect(() => {
    const container = companyJobsContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  /* ---------------- SAVE JOB MUTATION WITH OPTIMISTIC UPDATE ---------------- */
  const saveJobMutation = useMutation({
    // FIX: Added ensureValidToken to saveJobMutation (was missing, present in unsave/apply)
    mutationFn: async (id: string) => {
      await ensureValidToken()
      return saveJob({ id })
    },

    onMutate: async id => {
      setSavingJobIds(prev => new Set(prev).add(id))

      await queryClient.cancelQueries({ queryKey: ['job-details', id] })
      await queryClient.cancelQueries({
        queryKey: ['similar-jobs', job?.data?.id]
      })

      const prevJobDetails = queryClient.getQueryData<any>(['job-details', id])
      const prevSimilarJobs = queryClient.getQueryData<any>([
        'similar-jobs',
        job?.data?.id
      ])

      // Optimistically update allCompanyJobs state
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, saved_jobs: '1' } : job))
      )

      // Optimistically update job-details
      queryClient.setQueryData(['job-details', id], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            saved_jobs: '1'
          }
        }
      })

      // Optimistically update similar-jobs list
      queryClient.setQueryData(
        ['similar-jobs', job?.data?.id, companyJobsPage],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            jobs: (old.jobs || []).map((j: any) =>
              j.id === id ? { ...j, saved_jobs: '1' } : j
            )
          }
        }
      )

      return { prevJobDetails, prevSimilarJobs }
    },

    onSuccess: (_, id) => {
      setSavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Job saved')

      // FIX: Only invalidate save-related queries.
      // Do NOT invalidate "job-details" or "applied-jobs" — saving a job
      // has no effect on applied status, and invalidating those causes a
      // refetch that overwrites the optimistic applied_jobs state.
      queryClient.invalidateQueries({
        queryKey: ['similar-jobs', job?.data?.id],
        exact: false
      })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },

    onError: (error, id, context: any) => {
      setSavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, saved_jobs: '0' } : job))
      )
      if (context?.prevJobDetails) {
        queryClient.setQueryData(['job-details', id], context.prevJobDetails)
      }
      if (context?.prevSimilarJobs) {
        queryClient.setQueryData(
          ['similar-jobs', job?.data?.id],
          context.prevSimilarJobs
        )
      }
      toast.error('Failed to save job')
    }
  })

  const unsaveJobMutation = useMutation({
    mutationFn: async (id: string) => {
      await ensureValidToken()
      return unsaveJob({ id })
    },

    onMutate: async id => {
      setUnsavingJobIds(prev => new Set(prev).add(id))

      await queryClient.cancelQueries({ queryKey: ['job-details', id] })
      await queryClient.cancelQueries({
        queryKey: ['similar-jobs', job?.data?.id]
      })

      const prevJobDetails = queryClient.getQueryData<any>(['job-details', id])
      const prevSimilarJobs = queryClient.getQueryData<any>([
        'similar-jobs',
        job?.data?.id
      ])

      // Optimistically update allCompanyJobs state
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, saved_jobs: '0' } : job))
      )

      queryClient.setQueryData(['job-details', id], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            saved_jobs: '0'
          }
        }
      })

      queryClient.setQueryData(
        ['similar-jobs', job?.data?.id, companyJobsPage],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            jobs: (old.jobs || []).map((j: any) =>
              j.id === id ? { ...j, saved_jobs: '0' } : j
            )
          }
        }
      )

      return { prevJobDetails, prevSimilarJobs }
    },

    onSuccess: (_, id) => {
      setUnsavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Removed from saved')
      queryClient.invalidateQueries({
        queryKey: ['similar-jobs', job?.data?.id],
        exact: false
      })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },

    onError: (error, id, context: any) => {
      setUnsavingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, saved_jobs: '1' } : job))
      )
      if (context?.prevJobDetails) {
        queryClient.setQueryData(['job-details', id], context.prevJobDetails)
      }
      if (context?.prevSimilarJobs) {
        queryClient.setQueryData(
          ['similar-jobs', job?.data?.id],
          context.prevSimilarJobs
        )
      }
      toast.error('Failed to unsave job')
    }
  })

  const applyJobMutation = useMutation({
    mutationFn: async (id: string) => {
      await ensureValidToken()
      return applyJob({ id })
    },

    onMutate: async id => {
      setApplyingJobIds(prev => new Set(prev).add(id))

      await queryClient.cancelQueries({ queryKey: ['job-details', id] })
      await queryClient.cancelQueries({
        queryKey: ['similar-jobs', job?.data?.id]
      })

      const prevJobDetails = queryClient.getQueryData<any>(['job-details', id])
      const prevSimilarJobs = queryClient.getQueryData<any>([
        'similar-jobs',
        job?.data?.id
      ])

      // Optimistically update allCompanyJobs state
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, applied_jobs: '1' } : job))
      )

      queryClient.setQueryData(['job-details', id], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            applied_jobs: '1'
          }
        }
      })

      queryClient.setQueryData(
        ['similar-jobs', job?.data?.id, companyJobsPage],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            jobs: (old.jobs || []).map((j: any) =>
              j.id === id ? { ...j, applied_jobs: '1' } : j
            )
          }
        }
      )

      return { prevJobDetails, prevSimilarJobs }
    },

    onSuccess: (_, id) => {
      setApplyingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Job applied successfully')
      queryClient.invalidateQueries({
        queryKey: ['similar-jobs', job?.data?.id],
        exact: false
      })
      queryClient.invalidateQueries({ queryKey: ['applied-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job-details'] })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },

    onError: (error, id, context: any) => {
      setApplyingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      setAllCompanyJobs(prev =>
        prev.map(job => (job.id === id ? { ...job, applied_jobs: '0' } : job))
      )
      if (context?.prevJobDetails) {
        queryClient.setQueryData(['job-details', id], context.prevJobDetails)
      }
      if (context?.prevSimilarJobs) {
        queryClient.setQueryData(
          ['similar-jobs', job?.data?.id],
          context.prevSimilarJobs
        )
      }
      toast.error('Failed to apply for job')
    }
  })

  // Tolerant saved/applied check — backend can return '1' (string) or 1 (number).
  const isSavedFlag = (v: any) => String(v) === '1'
  const isAppliedFlag = (v: any) => String(v) === '1'

  // FIX: handleSave now correctly triggers unsave modal vs save
  const handleSave = () => {
    ensureAuthed('save this job', () => {
      if (isSavedFlag(job?.data?.saved_jobs)) {
        setJobToRemove(jobId)
        setShowRemoveModal(true)
      } else {
        saveJobMutation.mutate(jobId)
      }
    })
  }

  const { ensureCvReady, gateModal: applyGateModal } = useApplyGate()
  const { ensureAuthed, gateModal: authGateModal } = useAuthGate()

  // FIX: handleApply now opens job_link in a new tab (same pattern as JobListing).
  // If no job_link is present, show a confirmation modal before posting Apply.
  const handleApply = () => {
    // Gate auth FIRST, then the existing CV gate, then apply.
    ensureAuthed('apply for this job', () => {
      if (isAppliedFlag(job?.data?.applied_jobs)) return
      if (job?.data?.job_link) {
        // External link → "View Job": open directly. No CV gate for external
        // jobs; only direct-apply jobs require a CV first.
        window.open(job.data.job_link, '_blank', 'noopener,noreferrer')
        return
      }
      ensureCvReady(job?.data?.title || 'this job', () => {
        setApplyConfirmModal({
          jobId: jobId,
          title: job?.data?.title || 'this job'
        })
      })
    })
  }

  const handleCompanyJobSave = (companyJobId: string, isSaved: boolean) => {
    ensureAuthed('save this job', () => {
      if (isSaved) {
        setJobToRemove(companyJobId)
        setShowRemoveModal(true)
      } else {
        saveJobMutation.mutate(companyJobId)
      }
    })
  }

  // Similar/company jobs listed here are *other* jobs — applying is only
  // allowed from a job's own Details page, so this just opens that page.
  const handleCompanyJobApply = (companyJob: any) => {
    if (!companyJob?.id) return
    router.push(`/jobs/${companyJob.id}`)
  }

  const confirmApplyJob = () => {
    if (!applyConfirmModal) return
    applyJobMutation.mutate(applyConfirmModal.jobId)
    setApplyConfirmModal(null)
  }

  const cancelApplyJob = () => {
    setApplyConfirmModal(null)
  }

  const handleJobClick = (job: any) => {
    if (!job?.id) return
    router.push(`/jobs/${job.id}`)
  }

  // Data Section
  const jobLocations: string[] = job?.data?.location?.length
    ? job.data.location
    : []

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

  // Loading State
  if (isLoading) {
    return (
      <div className='container mx-auto  px-4'>
        <CompanyCoverImageSkeleton />
        <CompanyInfoSkeleton />
        <CompanyKeywordsSkeleton />
        <AboutCompanySkeleton />
        <BottomTabSectionSkeleton />
      </div>
    )
  }
  console.log(job?.data, 'job?.data')

  return (
    <main className={styles.profileLayout}>
      <div className='container mx-auto px-4'>
        <JobCoverImage jobDetails={job?.data} />

        <div className={styles.jobDetails_main_section}>
          <div
            className={`card_custom card_dark-bg gradient-card-bg ${styles.jobDetails_header_card}`}
            style={{
              background: isLight ? 'transparent' : '',
              position: 'relative',
              padding: '24px',
            }}
          >
            {/* Bounce + tooltip keyframes */}
            <style>{`
              @keyframes jd-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(3px)} }
              .jd-scroll-icon { animation: jd-bounce 1.5s ease-in-out infinite; display:flex; }
              .jd-action-btn { position:relative }
              .jd-action-btn::after {
                content: attr(data-tooltip);
                position: absolute; bottom: -32px; left: 50%;
                transform: translateX(-50%) scale(0.9);
                padding: 4px 10px; border-radius: 6px;
                font-size: 11px; font-weight: 500; white-space: nowrap;
                background: rgba(0,0,0,0.85); color: #fff;
                pointer-events: none; opacity: 0;
                transition: opacity 0.15s, transform 0.15s;
                z-index: 10;
              }
              .jd-action-btn:hover::after {
                opacity: 1; transform: translateX(-50%) scale(1);
              }
              /* Text action buttons reuse the project pill styles but size to
                 their label (the base classes hard-pin width:120px). */
              .jd-text-btn {
                width: 190px !important;
                padding: 0 22px !important;
                height: 40px !important;
                white-space: nowrap;
                cursor: pointer;
              }
              .jd-text-btn:disabled { cursor: default; }
            `}</style>

            {/* Action buttons — top right, stacked vertically:
                Save (icon) → Apply (text) → View Similar Job (text). */}
            <div
              className={styles.jobDetails_header_actions}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20, zIndex: 2 }}
            >
              {/* Save / Unsave — icon button (kept as-is) */}
              <button
                className='jd-action-btn'
                data-tooltip={isSavedFlag(job?.data?.saved_jobs) ? 'Saved' : 'Save Job'}
                disabled={savingJobIds.has(jobId) || unsavingJobIds.has(jobId)}
                onClick={handleSave}
                style={{
                  width: 40, height: 40, borderRadius: '50%', padding: 0,
                  border: `1.5px solid ${isSavedFlag(job?.data?.saved_jobs) ? (isLight ? '#5433ff' : '#7c6aff') : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)')}`,
                  background: isSavedFlag(job?.data?.saved_jobs)
                    ? (isLight ? 'rgba(84,51,255,0.06)' : 'rgba(84,51,255,0.12)')
                    : 'transparent',
                  color: isSavedFlag(job?.data?.saved_jobs) ? '#5433ff' : (isLight ? '#64748b' : 'rgba(255,255,255,0.6)'),
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {savingJobIds.has(jobId) || unsavingJobIds.has(jobId)
                  ? <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : isSavedFlag(job?.data?.saved_jobs) ? <Bookmark size={18} fill="currentColor" /> : <Bookmark size={18} />}
              </button>

              {/* Apply on Website / Apply Now — text button */}
              <button
                className={
                  isLight
                    ? `${isAppliedFlag(job?.data?.applied_jobs) ? 'light-applied-btn' : 'light-apply-btn'} jd-text-btn`
                    : `btn-gradient jd-text-btn ${isAppliedFlag(job?.data?.applied_jobs) ? 'apply-btn' : ''}`
                }
                disabled={applyingJobIds.has(jobId) || isAppliedFlag(job?.data?.applied_jobs)}
                onClick={handleApply}
              >
                {applyingJobIds.has(jobId)
                  ? 'Applying...'
                  : isAppliedFlag(job?.data?.applied_jobs)
                  ? 'Applied'
                  : job?.data?.job_link
                  ? 'Apply on Website'
                  : 'Apply Now'}
              </button>

              {/* View Similar Job — text button */}
              {uniqueCompanyJobs.length > 0 && (
                <button
                  className={
                    isLight
                      ? 'light-save-btn jd-text-btn'
                      : 'social-media-btn gradient-border-btn jd-text-btn'
                  }
                  onClick={() => document.getElementById('similar-jobs-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Similar Job
                </button>
              )}
            </div>

            {/* Logo + Info — stacked layout */}
            <div className={styles.jobDetails_header_main} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div className={styles.jobDetails_job_item_logo} style={{ flexShrink: 0 }}>
                <LogoWithFallback
                  src={job?.data?.company_color_url || job?.data?.company_logo_url}
                  name={job?.data?.company_name || job?.data?.title || ''}
                  size={100}
                  borderRadius={16}
                  alt='logo'
                />
              </div>

              <div className={styles.jobDetails_header_info} style={{ flex: 1, minWidth: 0 }}>
                {/* Title */}
                <h2
                  className={styles.jobDetails_job_item_title}
                  style={{ color: isLight ? '#040F1F' : '#fff', marginTop: 0, fontSize: 22, marginBottom: 6 }}
                >
                  {job?.data?.title}
                </h2>

                {/* Company */}
                <Link
                  href={`/company/${job?.data?.company_id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: isLight ? '#64748b' : '#a0aec0',
                    fontSize: 14, fontWeight: 500, textDecoration: 'none',
                    marginBottom: 12,
                  }}
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M3 21h18' /><path d='M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16' /><path d='M16 21V9h3a2 2 0 0 1 2 2v10' /><path d='M8 7h2M8 11h2M8 15h2' />
                  </svg>
                  {job?.data?.company_name}
                </Link>

                {/* Locations */}
                {jobLocations.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, marginTop: 4 }}>
                    {jobLocations.map((loc, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                          color: isLight ? '#475569' : '#a0aec0',
                          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <MapPin size={10} />
                        {loc}
                      </span>
                    ))}
                  </div>
                )}

                {/* Chips row: time + employment type + salary */}
                <div className={styles.jobDetails_header_chips} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  {job?.data?.created_at && (
                    <span className={jobstyles.jobListing_chip}>
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                        <circle cx='12' cy='12' r='9' /><path d='M12 7v5l3 2' />
                      </svg>
                      {getTimeAgo(job.data.created_at)}
                    </span>
                  )}
                  {job?.data?.employment_type && (
                    <span className={jobstyles.jobListing_chip}>
                      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2048 2048' aria-hidden='true'>
                        <path d='M0 0h2048v2048H0z' fill='none' />
                        <path fill='currentColor' d='M1582 1065q41 72 61 150t21 161v103l-640 321l-640-321q0-60 1-112t9-101t24-98t48-103L256 960v587q29 10 52 28t41 42t26 52t9 59v320H0v-320q0-30 9-58t26-53t40-42t53-28V896L0 832l1024-512l1024 512zM256 1728q0-26-19-45t-45-19t-45 19t-19 45v192h128zm30-896l738 369l738-369l-738-369zm1250 568q0-77-15-143t-53-135l-444 222l-444-222q-33 58-50 122t-18 132v24l512 256z' />
                      </svg>
                      {job?.data?.employment_type}
                    </span>
                  )}
                  {job?.data?.salary_range && (
                    <span className={jobstyles.jobListing_chip}>
                      <svg width='13' height='13' viewBox='0 0 32 32' aria-hidden='true'>
                        <path fill='currentColor' d='M2 22h28v2H2zm0 4h28v2H2zm22-16a2 2 0 1 0 2 2a2 2 0 0 0-2-2m-8 6a4 4 0 1 1 4-4a4.005 4.005 0 0 1-4 4m0-6a2 2 0 1 0 2 2a2 2 0 0 0-2-2m-8 0a2 2 0 1 0 2 2a2 2 0 0 0-2-2' />
                        <path fill='currentColor' d='M28 20H4a2.005 2.005 0 0 1-2-2V6a2.005 2.005 0 0 1 2-2h24a2.005 2.005 0 0 1 2 2v12a2.003 2.003 0 0 1-2 2m0-14H4v12h24Z' />
                      </svg>
                      {job?.data?.salary_range}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className='mt-4'>
            {/* 1. Overview Section — full width */}
            <div
              className={`card_custom card_dark-bg gradient-card-bg ${styles.jobDetails_overview_section}`}
            >
              <h2 className={styles.jobDetails_job_details_title_fixed}>
                Job Overview
              </h2>

              {job?.data?.keywords && job.data.keywords.length > 0 && (
                <div className={styles.jobDetails_overview_skills}>
                  <div className={styles.jobDetails_meta_box_header}>
                    <span className={styles.jobDetails_meta_box_icon}>
                      <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.8'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        aria-hidden='true'
                      >
                        <path d='m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z' />
                      </svg>
                    </span>
                    <h4 className={styles.jobDetails_meta_box_title}>
                      Required Skills
                    </h4>
                  </div>
                  <div className={styles.jobDetails_meta_chips}>
                    {job?.data?.keywords?.map(
                      (keyword: string, index: Key | null | undefined) => (
                        <span
                          key={index}
                          className={styles.jobDetails_skill_chip}
                        >
                          {keyword}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className={styles.jobDetails_overview_row}>
                <div className={styles.jobDetails_overview_item}>
                  <div className={styles.jobDetails_meta_box_header}>
                    <span className={styles.jobDetails_meta_box_icon}>
                      <svg
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
                      </svg>
                    </span>
                    <h4 className={styles.jobDetails_meta_box_title}>
                      Job Sector
                    </h4>
                  </div>
                  <p className={styles.jobDetails_meta_box_value}>
                    {job?.data?.job_sector || 'N/A'}
                  </p>
                </div>

                <div className={styles.jobDetails_overview_item}>
                  <div className={styles.jobDetails_meta_box_header}>
                    <span className={styles.jobDetails_meta_box_icon}>
                      <User size={18} />
                    </span>
                    <h4 className={styles.jobDetails_meta_box_title}>
                      Job Role
                    </h4>
                    {job?.data?.job_role?.explanation && (
                      <span
                        ref={jobRoleTriggerRef}
                        onMouseEnter={openJobRoleTooltip}
                        onMouseLeave={closeJobRoleTooltip}
                        onFocus={openJobRoleTooltip}
                        onBlur={closeJobRoleTooltip}
                        tabIndex={0}
                        style={{
                          display: 'inline-flex',
                          cursor: 'pointer',
                          color: isLight ? '#000' : '#FFF',
                          flexShrink: 0
                        }}
                        aria-label='Show job role details'
                      >
                        <Info size={16} />
                        {jobRoleModalOpen &&
                          jobRoleTooltipPos &&
                          typeof document !== 'undefined' &&
                          createPortal(
                            <span
                              role='tooltip'
                              style={{
                                position: 'fixed',
                                top: jobRoleTooltipPos.top - 10,
                                left: jobRoleTooltipPos.left,
                                transform: 'translateY(-100%)',
                                width: 'max-content',
                                maxWidth: 360,
                                padding: '12px 14px',
                                background: isLight ? '#FFFFFF' : '#0B172A',
                                border: isLight
                                  ? '1px solid rgba(0,0,0,0.08)'
                                  : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 10,
                                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                                color: isLight ? '#555' : '#D6DEEC',
                                fontFamily: 'var(--font-dm-sans)',
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: 1.55,
                                textAlign: 'left',
                                whiteSpace: 'normal',
                                wordBreak: 'normal',
                                overflowWrap: 'anywhere',
                                cursor: 'default',
                                zIndex: 1000,
                                pointerEvents: 'none'
                              }}
                            >
                              {job?.data?.job_role?.role && (
                                <span
                                  style={{
                                    display: 'block',
                                    marginBottom: 6,
                                    fontFamily: 'var(--font-plus-jakarta)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                    color: isLight ? '#040F1F' : '#FFFFFF'
                                  }}
                                >
                                  {job.data.job_role.role}
                                </span>
                              )}
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: job.data.job_role.explanation
                                }}
                              />
                              <span
                                aria-hidden='true'
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 8,
                                  width: 0,
                                  height: 0,
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: `6px solid ${
                                    isLight ? '#FFFFFF' : '#0B172A'
                                  }`
                                }}
                              />
                            </span>,
                            document.body
                          )}
                      </span>
                    )}
                  </div>
                  <p className={styles.jobDetails_meta_box_value}>
                    {job?.data?.job_role?.role || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. About the Job + About the Company — equal-height pair */}
            <div className={styles.jobDetails_two_col}>
              <div
                className={`card_custom card_dark-bg gradient-card-bg ${styles.jobDetails_panel}`}
              >
                <div className={styles.jobDetails_job_details_content}>
                  <h2 className={styles.jobDetails_job_details_title_fixed}>
                    About the Job
                  </h2>
                  <div
                    className={styles.jobDetails_job_details_description_scroll}
                  >
                    {job?.data?.description && (
                      <div className='mb-8'>
                        <h4
                          className={
                            styles.jobDetails_job_details_description_subtitle
                          }
                        >
                          Job Description
                        </h4>
                        <RenderHtmlContent
                          html={job?.data?.description}
                          className={
                            styles.jobDetails_job_details_description_text
                          }
                        />
                      </div>
                    )}

                    {job?.data?.requirements && (
                      <div className='mb-8'>
                        <h4
                          className={
                            styles.jobDetails_job_details_description_subtitle
                          }
                        >
                          Requirements
                        </h4>
                        <p
                          className={
                            styles.jobDetails_job_details_description_text
                          }
                        >
                          {job?.data?.requirements}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${styles.jobListing_card_company_inner} card-company-details bg-gradient-card ${styles.jobDetails_panel}`}
              >
                <h2
                  className={styles.jobListing_card_title}
                  style={{
                    color: isLight ? '#040F1F' : 'rgba(255, 255, 255, 1)'
                  }}
                >
                  About the Company
                </h2>
                <div
                  className={`${styles.jobListing_company_card} card-hover`}
                  onClick={e => {
                    e.stopPropagation()
                    router.push(`/company/${job?.data?.company_id}`)
                  }}
                >
                  <div className='flex align-middle gap-4'>
                    <div className={styles.jobDetails_job_company_card_logo}>
                      <LogoWithFallback
                        src={
                          job?.data?.company_color_url ||
                          job?.data?.company_logo_url
                        }
                        name={job?.data?.company_name || ''}
                        size={70}
                        borderRadius={12}
                        alt='logo'
                      />
                    </div>
                    <div
                      className={styles.jobDetails_job_item_info}
                      style={{ justifyContent: 'flex-start', gap: 6 }}
                    >
                      <h2 className={styles.jobDetails_job_item_company}>
                        <Link href={`/company/${job?.data?.company_id}`}>
                          {job?.data?.company_name}
                        </Link>
                      </h2>

                      {job?.data?.company_address && (
                        <div className='flex items-start gap-1 -mt-2'>
                          <MapPin
                            height={16}
                            width={16}
                            color={isLight ? '#888888' : '#A0AEC0'}
                          />
                          <p className={styles.jobDetails_job_item_location}>
                            {job.data.company_address}
                          </p>
                        </div>
                      )}
                      {job?.data?.job_sector && (
                        <div className='flex flex-col gap-1'>
                          <span
                            className='flex items-center gap-1'
                            style={{
                              color: isLight ? '#888888' : '#A0AEC0',
                              fontFamily: 'var(--font-dm-sans)',
                              fontSize: 12,
                              fontWeight: 400,
                              lineHeight: 1
                            }}
                          >
                            <Image
                              src={BuildingIcon}
                              alt='Industry'
                              width={14}
                              height={14}
                              style={
                                isLight
                                  ? {
                                      filter:
                                        'brightness(0) saturate(100%) invert(60%) sepia(6%) saturate(735%) hue-rotate(178deg) brightness(90%) contrast(88%)'
                                    }
                                  : {
                                      filter:
                                        'brightness(0) saturate(100%) invert(74%) sepia(6%) saturate(735%) hue-rotate(178deg) brightness(90%) contrast(88%)'
                                    }
                              }
                            />
                            Industry
                          </span>
                          <p
                            style={{
                              color: isLight ? '#040F1F' : '#FFFFFF',
                              fontFamily: 'var(--font-dm-sans)',
                              fontSize: 14,
                              fontWeight: 400,
                              lineHeight: 1.2,
                              margin: 0
                            }}
                          >
                            {job.data.job_sector}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={
                    styles.jobDetails_job_company_description_scrollable
                  }
                >
                  <RenderHtmlContent
                    html={job?.data?.company_description}
                    className={styles.jobDetails_job_company_description}
                  />
                </div>
              </div>
            </div>

            {/* 3. Similar Jobs — full width at the bottom. Only render the
                whole section when there are actually similar jobs to show. */}
            {uniqueCompanyJobs.length > 0 && (
              <div
                id='similar-jobs-section'
                className={`${styles.jobListing_card_morejob_inner} card-company-details gradient-card-bg`}
              >
                <h2
                  className={styles.jobListing_card_title}
                  style={{
                    color: isLight ? '#040F1F' : 'rgba(255, 255, 255, 1)'
                  }}
                >
                  Similar Jobs
                </h2>

                <div
                  ref={companyJobsContainerRef}
                  className={styles.jobListing_more_jobs_card_wrapper}
                  style={{ overflowY: 'auto' }}
                >
                  {allCompanyJobs.length === 0 && !companyJobsLoading ? (
                    <div className='text-center py-8'>
                      <p className='text-gray-400'>No jobs available</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.jobDetails_similar_grid}>
                        {uniqueCompanyJobs.map(companyJob => (
                          <div
                            key={companyJob.id}
                            className={`${styles.jobListing_more_jobs_card} card-hover cursor-pointer`}
                            onClick={() => handleJobClick(companyJob)}
                          >
                            <div className='flex align-middle gap-4'>
                              <div
                                className={
                                  styles.jobDetails_job_company_card_logo
                                }
                              >
                                <LogoWithFallback
                                  src={
                                    companyJob.company_color_url ||
                                    companyJob.company_logo_url
                                  }
                                  name={
                                    companyJob.company_name ||
                                    companyJob.title ||
                                    ''
                                  }
                                  size={60}
                                  borderRadius={10}
                                  alt='logo'
                                />
                              </div>
                              <div
                                className={`${styles.jobDetails_job_item_info} min-w-0 flex-1`}
                              >
                                <h2
                                  className={styles.jobDetails_job_item_company}
                                >
                                  <Link href={`/company/${companyJob.id}`}>
                                    {companyJob.title}
                                  </Link>
                                </h2>

                                <p
                                  className={
                                    styles.jobDetails_job_item_description
                                  }
                                  onClick={e => {
                                    e.stopPropagation()
                                    router.push(
                                      `/company/${companyJob.company_id}`
                                    )
                                  }}
                                >
                                  {companyJob.company_name}
                                </p>
                                {/* <div className="flex items-start gap-1">
                                    <MapPin height={13} width={13} />
                                    <p
                                      className={
                                        styles.jobDetails_job_item_location
                                      }
                                    >
                                      {companyJob.location?.join(", ") ||
                                        "Not Specified"}
                                    </p>
                                  </div> */}
                                {companyJob.location?.length ? (
                                  <JobLocations
                                    locations={companyJob.location}
                                    isLight={isLight}
                                    title={companyJob.title}
                                  />
                                ) : null}
                                {companyJob.created_at && (
                                  <p
                                    className='text-[12px] text-[#A0AEC0]'
                                    style={isLight ? { color: '#888' } : {}}
                                  >
                                    Posted{' '}
                                    {getTimeAgoJobListing(
                                      companyJob.created_at
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div
                              className={styles.jobListing_more_jobs_card_btns}
                            >
                              <button
                                className={
                                  isLight
                                    ? isAppliedFlag(companyJob.applied_jobs)
                                      ? 'light-applied-btn width-auto-css w-full'
                                      : 'light-apply-btn width-auto-css w-full'
                                    : `${
                                        styles.jobListing_more_jobs_card_btn
                                      } btn-gradient cursor-pointer ${
                                        isAppliedFlag(companyJob.applied_jobs)
                                          ? 'apply-btn'
                                          : ''
                                      }`
                                }
                                onClick={e => {
                                  e.stopPropagation()
                                  handleCompanyJobApply(companyJob)
                                }}
                                disabled={isAppliedFlag(
                                  companyJob.applied_jobs
                                )}
                              >
                                <span>
                                  {isAppliedFlag(companyJob.applied_jobs)
                                    ? 'Applied Job'
                                    : 'View Job'}
                                </span>
                              </button>
                              <button
                                className={
                                  isLight
                                    ? 'light-save-btn width-auto-css w-full'
                                    : `${styles.jobListing_more_jobs_card_btn} social-media-btn gradient-border-btn`
                                }
                                onClick={e => {
                                  e.stopPropagation()
                                  handleCompanyJobSave(
                                    companyJob.id,
                                    isSavedFlag(companyJob.saved_jobs)
                                  )
                                }}
                                disabled={
                                  savingJobIds.has(companyJob.id) ||
                                  unsavingJobIds.has(companyJob.id)
                                }
                              >
                                <span className={isLight ? '' : 'text-white'}>
                                  {savingJobIds.has(companyJob.id)
                                    ? 'Saving...'
                                    : unsavingJobIds.has(companyJob.id)
                                    ? 'Unsaving...'
                                    : isSavedFlag(companyJob.saved_jobs)
                                    ? 'Saved Job'
                                    : 'Save Job'}
                                </span>
                              </button>

                              {/* FIX: Pass full companyJob object instead of just id
                                    so handleCompanyJobApply can access job_link */}
                            </div>
                          </div>
                        ))}
                      </div>

                      {companyJobsLoading && (
                        <div className='flex items-center justify-center py-6'>
                          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {job?.data?.company_logo_url && (
        <ProfileImagePreview
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={job?.data?.company_logo_url}
          firstName={job?.data?.company_name}
          lastName={''}
        />
      )}

      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={cancelRemoveJob}
        title='Remove saved job?'
        message='Are you sure you want to remove this job from your saved list?'
        onConfirm={confirmRemoveJob}
        confirmText='Yes, Remove'
        cancelText='No'
      />

      <ConfirmModal
        isOpen={!!applyConfirmModal}
        onClose={cancelApplyJob}
        title='Apply for Job'
        message={`Are you sure you want to apply for ${
          applyConfirmModal?.title ?? 'this job'
        }?`}
        onConfirm={confirmApplyJob}
        confirmText='Apply'
        cancelText='Cancel'
        isLoading={applyJobMutation.isPending}
        loadingText='Applying...'
      />
      {applyGateModal}
      {authGateModal}
    </main>
  )
}
