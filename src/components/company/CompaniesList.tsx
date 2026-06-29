'use client'

import Image from 'next/image'
import { MapPin, X } from 'lucide-react'

import styles from '@/moduleCss/jobs.module.css'
import styleSheet from '@/_assets/style/style.module.css'
import mainstyles from '@/moduleCss/jobDetails.module.css'
import Jobstyle from '@/moduleCss/jobs.module.css'
import { useTheme } from '@/context/ThemeContext'
import CompanyLogo from '../../../public/images/company-logo-default.svg'
import UserDefaultImg from '../../../public/profile/default_user_icon.png'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import jobstyles from '@/moduleCss/jobs.module.css'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { fetchCompaniesList, followCompany, fetchFollowings } from '@/services/company.services'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import { useHasSession } from '@/app/hooks/useHasSession'
import { fetchFilterList } from '@/services/jobs.services'
import SortByPills, { DEFAULT_SORT_GROUPS } from '../commonUI/SortByPills'
import FilterSortTrigger from '../commonUI/FilterSortTrigger'
import FilterSortModal, { FilterSection } from '../commonUI/FilterSortModal'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useListingPreserve } from '@/app/hooks/useListingPreserve'
import { useListingState } from '@/app/hooks/useListingState'
import LogOutModal from '../commonUI/LogOutModal'
import { toast } from 'react-toastify'
import { ensureValidToken } from '@/lib/tokenManager'
import { de } from 'date-fns/locale'
import Avatar from '../commonUI/Avatar'
import ProfileCardsmall from '../commonUI/ProfileCardsmall'

import JobCardSkeleton from '../commonUI/loaders/skeletons/JobCardSkeleton'
import ReadMoreCaption from '../home/ReadMoreCaption'
import BuildingIcon from '@/_assets/icons/header_icons/clarity_building-solid.svg'
import { LogoWithFallback } from '../commonUI/InitialAvatar'
type TabType = 'all' | 'following'
const CompaniesList = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { saveBeforeNavigate, setScrollContainer } = useListingPreserve('company-list')

  // Persist listing UI state (tab, search, industries) so back-navigation
  // from /company/<id> restores the user's prior view without a refetch.
  // Search/filter/sort state is kept *per tab* so toggling filters on
  // Following doesn't pollute the All-tab query (and vice versa).
  const defaultTabFilters = {
    searchText: '',
    selectedIndustries: [] as string[],
    sortBy: 'recently_added',
  }
  type TabFilters = typeof defaultTabFilters

  const [persisted, setPersisted] = useListingState('company-list', {
    activeTab: 'all' as TabType,
    all: { ...defaultTabFilters },
    following: { ...defaultTabFilters },
  })

  const [activeTab, setActiveTabState] = useState<TabType>(persisted.activeTab)
  const [allFilters, setAllFiltersState] = useState<TabFilters>(
    persisted.all ?? { ...defaultTabFilters },
  )
  const [followingFilters, setFollowingFiltersState] = useState<TabFilters>(
    persisted.following ?? { ...defaultTabFilters },
  )
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  const setActiveTab = useCallback(
    (tab: TabType) => {
      setActiveTabState(tab)
      setPersisted(prev => ({ ...prev, activeTab: tab }))
    },
    [setPersisted],
  )

  // Active-tab view onto whichever filter slice the user is editing.
  const activeFilters = activeTab === 'following' ? followingFilters : allFilters
  const searchText = activeFilters.searchText
  const selectedIndustries = activeFilters.selectedIndustries
  const sortBy = activeFilters.sortBy

  const updateActiveFilters = useCallback(
    (patch: Partial<TabFilters>) => {
      if (activeTab === 'following') {
        setFollowingFiltersState(prev => {
          const next = { ...prev, ...patch }
          setPersisted(p => ({ ...p, following: next }))
          return next
        })
      } else {
        setAllFiltersState(prev => {
          const next = { ...prev, ...patch }
          setPersisted(p => ({ ...p, all: next }))
          return next
        })
      }
    },
    [activeTab, setPersisted],
  )

  const setSearchText = useCallback(
    (text: string) => updateActiveFilters({ searchText: text }),
    [updateActiveFilters],
  )
  const setSortBy = useCallback(
    (next: string) => updateActiveFilters({ sortBy: next }),
    [updateActiveFilters],
  )
  const setSelectedIndustries = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      const current =
        activeTab === 'following'
          ? followingFilters.selectedIndustries
          : allFilters.selectedIndustries
      const value = typeof next === 'function' ? next(current) : next
      updateActiveFilters({ selectedIndustries: value })
    },
    [activeTab, allFilters.selectedIndustries, followingFilters.selectedIndustries, updateActiveFilters],
  )

  // Per-tab debounced search — All-tab query uses allDebouncedSearch and
  // Following-tab client filter uses followingDebouncedSearch, so each tab's
  // search input is independent.
  const [allDebouncedSearch, setAllDebouncedSearch] = useState(
    allFilters.searchText,
  )
  const [followingDebouncedSearch, setFollowingDebouncedSearch] = useState(
    followingFilters.searchText,
  )

  useEffect(() => {
    const t = setTimeout(
      () => setAllDebouncedSearch(allFilters.searchText),
      500,
    )
    return () => clearTimeout(t)
  }, [allFilters.searchText])

  useEffect(() => {
    const t = setTimeout(
      () => setFollowingDebouncedSearch(followingFilters.searchText),
      500,
    )
    return () => clearTimeout(t)
  }, [followingFilters.searchText])

  const debouncedSearch =
    activeTab === 'following' ? followingDebouncedSearch : allDebouncedSearch

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [pendingAction, setPendingAction] = useState<
    'follow' | 'unfollow' | null
  >(null)

  const { data: userProfile } = useUserProfile()

  const user = userProfile?.data
  const observerRef = useRef<HTMLDivElement | null>(null)

  // Modal State
  const [showUnfollowModal, setShowUnfollowModal] = useState(false)
  const [companyToUnfollow, setCompanyToUnfollow] = useState<string | null>(
    null
  )
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const arrayToCommaSeparatedString = (arr: string[]): string | undefined => {
    if (!arr || arr.length === 0) return undefined
    return arr.join(', ')
  }

  /* ---------------- FILTER LIST QUERY ---------------- */
  const { data: filterListData } = useQuery({
    queryKey: ['filter-list'],
    queryFn: fetchFilterList,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })

  /* ---------------- ALL COMPANIES QUERY ---------------- */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: companiesLoading,
    isError: companiesError
  } = useInfiniteQuery({
    queryKey: [
      'companies-list',
      allDebouncedSearch,
      allFilters.selectedIndustries,
      allFilters.sortBy,
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchCompaniesList({
        page: pageParam,
        limit: 10,
        search_text: allDebouncedSearch,
        industry_id: arrayToCommaSeparatedString(allFilters.selectedIndustries),
        sort_by: allFilters.sortBy,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length
      const totalCount = lastPage?.total_count || 0
      const totalPages = Math.ceil(totalCount / 10)

      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1
  })

  // The backend ignores `sort_by` on the companies list (same quirk as jobs),
  // so sort the loaded pages client-side — mirroring the Following tab — to make
  // A-to-Z / Z-to-A actually work. (recently_added matches the backend default.)
  const companies = useMemo(() => {
    const flat = data?.pages.flatMap(page => page?.result || []) || []
    if (allFilters.sortBy === 'a_to_z') {
      return [...flat].sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''),
      )
    }
    if (allFilters.sortBy === 'z_to_a') {
      return [...flat].sort((a, b) =>
        (b.name || '').localeCompare(a.name || ''),
      )
    }
    if (allFilters.sortBy === 'recently_added') {
      return [...flat].sort((a, b) => {
        const ad = new Date(a.created_at || 0).getTime()
        const bd = new Date(b.created_at || 0).getTime()
        return bd - ad
      })
    }
    return flat
  }, [data, allFilters.sortBy])

  /* ---------------- SCROLL RESTORATION ---------------- */
  const navigateToCompany = useCallback(
    (companyId: string) => {
      saveBeforeNavigate()
      router.push(`/company/${companyId}`)
    },
    [router, saveBeforeNavigate]
  )

  const { data: hasSession } = useHasSession()

  /* ---------------- FOLLOWINGS QUERY (fetch all, filter client-side) ---------------- */
  // Personalized (the user's followed companies) — only fetch when logged in so
  // anonymous visitors on the public companies page don't trigger an auth call.
  const {
    data: followingsRawData,
    isLoading: followingsLoading,
    isError: followingsError
  } = useQuery({
    queryKey: ['followings-all'],
    queryFn: () => fetchFollowings({ page: 1, limit: 10000 }),
    enabled: activeTab === 'following' && hasSession === true,
    staleTime: 1000 * 60 * 5,
  })

  /* ---------------- FOLLOWINGS COUNT (sidebar; logged-in only) ---------------- */
  const { data: followingsCountData } = useQuery({
    queryKey: ['followings-count'],
    queryFn: () => fetchFollowings({ page: 1, limit: 1 }),
    enabled: hasSession === true,
    staleTime: 0,
    refetchOnMount: true,
  })

  /* ---------------- CLIENT-SIDE SEARCH & FILTER FOR FOLLOWINGS ---------------- */
  const followingCompanies = useMemo(() => {
    const raw = followingsRawData?.result || []
    if (!Array.isArray(raw) || raw.length === 0) return raw

    // Use the *following*-tab filter slice explicitly so this memo doesn't
    // recompute (and reset scroll, etc.) when the All-tab filters change.
    const followingSearch = followingDebouncedSearch
    const followingSelectedIndustries = followingFilters.selectedIndustries
    const followingSortBy = followingFilters.sortBy

    let filtered = [...raw]

    // Search filter
    if (followingSearch && followingSearch.trim() !== '') {
      const search = followingSearch.toLowerCase().trim()
      filtered = filtered.filter((company: any) => {
        const name = (company.name || '').toLowerCase()
        const address = (company.address || '').toLowerCase()
        const description = (company.description || '').toLowerCase()
        return (
          name.includes(search) ||
          address.includes(search) ||
          description.includes(search)
        )
      })
    }

    // Industry filter — selectedIndustries holds stringified ids from the
    // filter list. The followings API returns company entries whose industry
    // field may be a name string, an id, an object, an array of any of the
    // above, or a comma-separated string. Match against both ids and names
    // so the filter works regardless of the actual shape.
    if (followingSelectedIndustries.length > 0) {
      const idSet = new Set(followingSelectedIndustries.map(String))
      const industryList: any[] = Array.isArray(filterListData?.data?.industry)
        ? filterListData.data.industry
        : []
      const nameSet = new Set(
        industryList
          .filter((i: any) => idSet.has(String(i?.id ?? i)))
          .map((i: any) => String(i?.name ?? i).toLowerCase().trim())
      )

      const matches = (val: any): boolean => {
        if (val == null) return false
        if (Array.isArray(val)) return val.some(matches)
        if (typeof val === 'object') {
          return (
            (val.id != null && idSet.has(String(val.id))) ||
            (val.name != null &&
              nameSet.has(String(val.name).toLowerCase().trim()))
          )
        }
        const s = String(val).trim()
        if (!s) return false
        // Comma-separated lists
        if (s.includes(',')) {
          return s.split(',').some((part) => matches(part))
        }
        return idSet.has(s) || nameSet.has(s.toLowerCase())
      }

      filtered = filtered.filter((company: any) =>
        matches(
          company.industry ??
            company.industries ??
            company.industry_id ??
            company.job_sector ??
            company.industry_name
        )
      )
    }

    // Client-side sort
    if (followingSortBy === 'a_to_z') {
      filtered.sort((a: any, b: any) =>
        (a.name || '').localeCompare(b.name || ''),
      )
    } else if (followingSortBy === 'z_to_a') {
      filtered.sort((a: any, b: any) =>
        (b.name || '').localeCompare(a.name || ''),
      )
    } else if (followingSortBy === 'recently_added') {
      filtered.sort((a: any, b: any) => {
        const ad = new Date(a.created_at || 0).getTime()
        const bd = new Date(b.created_at || 0).getTime()
        return bd - ad
      })
    }

    return filtered
  }, [
    followingsRawData,
    followingDebouncedSearch,
    followingFilters.selectedIndustries,
    followingFilters.sortBy,
    filterListData,
  ])

  // Follow / Unfollow Mutation (Single API)
  const followMutation = useMutation({
    // mutationFn: (companyId: string) => followCompany({ company_id: companyId }),
    mutationFn: async (companyId: string) => {
      await ensureValidToken()
      return followCompany({ company_id: companyId })
    },
    onMutate: async companyId => {
      await queryClient.cancelQueries({
        queryKey: ['companies-list', allDebouncedSearch, allFilters.selectedIndustries]
      })

      const previousData = queryClient.getQueryData([
        'companies-list',
        allDebouncedSearch,
      ])

      // Detect whether this is a follow or unfollow before we mutate, so we
      // know which direction to nudge the count after the API succeeds.
      let wasFollowing = false
      const cached: any = queryClient.getQueryData([
        'companies-list',
        debouncedSearch,
        selectedIndustries
      ])
      cached?.pages?.forEach((page: any) => {
        page?.result?.forEach((c: any) => {
          if (c.id === companyId) wasFollowing = !!c.follow_status
        })
      })

      queryClient.setQueryData(
        ['companies-list', allDebouncedSearch, allFilters.selectedIndustries],
        (old: any) => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              result: page.result.map((company: any) =>
                company.id === companyId
                  ? {
                      ...company,
                      follow_status: !company.follow_status
                    }
                  : company
              )
            }))
          }
        }
      )

      return { previousData, wasFollowing }
    },

    onSuccess: (_data, _companyId, context) => {
      // Only update the Following count after the API confirms success.
      const wasFollowing = context?.wasFollowing
      queryClient.setQueryData(['followings-count'], (old: any) => {
        if (!old) return old
        const delta = wasFollowing ? -1 : 1
        const current = Number(old.total_count ?? 0)
        return { ...old, total_count: Math.max(0, current + delta) }
      })

      if (pendingAction === 'follow') {
        toast.success('Successfully followed company')
      } else if (pendingAction === 'unfollow') {
        toast.success('Successfully unfollowed company')
      }

      setPendingAction(null)
    },

    onError: (error, __, context) => {
      if (isUnauthenticatedError(error)) openGate('follow this company')
      else toast.error('Failed to update follow status')
      if (context?.previousData) {
        queryClient.setQueryData(['companies-list'], context.previousData)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['companies-list', allDebouncedSearch, allFilters.selectedIndustries]
      })
      queryClient.invalidateQueries({ queryKey: ['followings-all'] })
      queryClient.invalidateQueries({ queryKey: ['followings-count'] })
    }
  })

  // Follow / Unfollow Click Handler
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const handleFollowToggle = (
    e: React.MouseEvent,
    companyId: string,
    isFollowing: boolean
  ) => {
    e.stopPropagation()

    ensureAuthed('follow this company', () => {
      if (isFollowing) {
        // setPendingAction('unfollow')
        // setCompanyToUnfollow(companyId)
        // setShowUnfollowModal(true)
        return
      } else {
        setPendingAction('follow')
        followMutation.mutate(companyId)
      }
    })
  }

  const confirmUnfollow = () => {
    if (!companyToUnfollow) return

    setPendingAction('unfollow')
    followMutation.mutate(companyToUnfollow)

    setShowUnfollowModal(false)
    setCompanyToUnfollow(null)
  }

  const cancelUnfollow = () => {
    setShowUnfollowModal(false)
    setCompanyToUnfollow(null)
  }

  const isFollowPending = (companyId: string) =>
    followMutation.isPending && followMutation.variables === companyId

  // Infinite Scroll Observer (All Companies tab only)
  useEffect(() => {
    if (!observerRef.current) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          if (activeTab === 'all' && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }
      },
      { threshold: 0.1 }
    )

    const current = observerRef.current
    observer.observe(current)

    return () => {
      if (current) observer.unobserve(current)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, activeTab])

  const handleTabChange = (tab: TabType) => {
    // Switching tabs clears the destination tab's search / filter / sort so
    // the user lands on a clean view. The other tab's state is left alone so
    // its query / count isn't affected by what was just discarded.
    setActiveTab(tab)
    setIsFilterOpen(false)

    const cleared = { ...defaultTabFilters }
    if (tab === 'following') {
      setFollowingFiltersState(cleared)
      setFollowingDebouncedSearch('')
      setPersisted(p => ({ ...p, following: cleared }))
      queryClient.invalidateQueries({ queryKey: ['followings-all'] })
    } else {
      setAllFiltersState(cleared)
      setAllDebouncedSearch('')
      setPersisted(p => ({ ...p, all: cleared }))
    }
  }

  const totalCount = data?.pages?.[0]?.total_count || 0
  // Prefer the always-on count query so the badge updates after follow/unfollow
  // even when the Following tab's list query is disabled (and therefore won't
  // auto-refetch on invalidation).
  const followingCount =
    followingsCountData?.total_count
    ?? followingsRawData?.total_count
    ?? (followingsRawData?.result?.length || 0)

  const companiesToRender = activeTab === 'following' ? followingCompanies : companies

  const sliceWords = (text: string, limit = 7) =>
    text.split(' ').slice(0, limit).join(' ')

  return (
    <>
      <div className='container mx-auto px-4'>
        <div
          className={`${styles.jobListing_main_section_wrapper} max-content-height`}
        >
          <div className='flex flex-wrap -mx-2 mt-6'>
            {/* Sidebar */}
            <div className='full-width-midium col-lg-4'>
              <aside className={styles.sidebar_main_section}>
                <ProfileCardsmall />

                <div className={Jobstyle.side_job_navigation}>
                  {companiesLoading || followingsLoading ? (
                    <>
                      <div style={{ width: '50%', height: 14, borderRadius: 6, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', animation: 'sidebarPulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: '60%', height: 14, borderRadius: 6, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', animation: 'sidebarPulse 1.5s ease-in-out infinite' }} />
                      <style>{`@keyframes sidebarPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTabChange('all')}
                        className={` ${Jobstyle.side_job_navigation_btn} ${
                          activeTab === 'all' ? Jobstyle.active : ''
                        }`}
                        style={
                          isLight
                            ? activeTab === 'all'
                              ? { fontWeight: 600, color: '#040F1F' }
                              : { color: '#888888' }
                            : undefined
                        }
                      >
                        All ({totalCount})
                      </button>
                      <button
                        onClick={() => handleTabChange('following')}
                        className={` ${Jobstyle.side_job_navigation_btn} ${
                          activeTab === 'following' ? Jobstyle.active : ''
                        }`}
                        style={
                          isLight
                            ? activeTab === 'following'
                              ? { fontWeight: 600, color: '#040F1F' }
                              : { color: '#888888' }
                            : undefined
                        }
                      >
                        Following ({followingCount})
                      </button>
                    </>
                  )}
                </div>
              </aside>
            </div>

            {/* Main Content */}
            <div className='full-width-midium col-lg-8'>
              <main className={styles.jobListing_main_section}>
                <div className={styles.jobListing_job_list_header}>
                  <div className='col-lg-6'>
                    <h1 className={styles.jobListing_main_section_title} style={isLight ? { color: '#040F1F' } : undefined}>
                      Companies
                    </h1>
                  </div>
                  <div className='col-lg-6 search-flex'>
                    <div className={styleSheet.search_panel_area}>
                      <form
                        className={styleSheet.search_form}
                        onSubmit={e => e.preventDefault()}
                      >
                        <span className={styleSheet.search_icon}>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width={20}
                            height={20}
                            viewBox='0 0 22 22'
                            fill='none'
                          >
                            <path
                              d='M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z'
                              fill='#E3E3E3'
                            />
                          </svg>
                        </span>
                        <input
                          type='text'
                          placeholder='Search'
                          value={searchText}
                          onChange={e => setSearchText(e.target.value)}
                          className={styleSheet.search_panel}
                        />

                        {searchText && (
                          <button
                            type='button'
                            onClick={() => setSearchText('')}
                            className={styleSheet.clear_search_button}
                            aria-label='Clear search'
                          >
                            <X className='w-4 h-4 cursor-pointer mt-[-3px]' />
                          </button>
                        )}
                        <span
                          className={styleSheet.search_panel_filter_icon}
                          onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
{/* <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 640 640"><path d="M182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4zM352 544L384 544C401.7 544 416 529.7 416 512C416 494.3 401.7 480 384 480L352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544zM352 416L448 416C465.7 416 480 401.7 480 384C480 366.3 465.7 352 448 352L352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416zM352 288L512 288C529.7 288 544 273.7 544 256C544 238.3 529.7 224 512 224L352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288zM352 160L576 160C593.7 160 608 145.7 608 128C608 110.3 593.7 96 576 96L352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160z" /></svg> */}

                        <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 640 640"  style={{transform: "rotate(180deg)", fill: isLight? "#000": "#fff"}} ><path d="M352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160L384 160C401.7 160 416 145.7 416 128C416 110.3 401.7 96 384 96L352 96zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288L448 288C465.7 288 480 273.7 480 256C480 238.3 465.7 224 448 224L352 224zM352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416L512 416C529.7 416 544 401.7 544 384C544 366.3 529.7 352 512 352L352 352zM352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544L576 544C593.7 544 608 529.7 608 512C608 494.3 593.7 480 576 480L352 480zM182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4z" /></svg>

                        </span>
                      </form>
                    </div>
                    {isFilterOpen &&
                      (selectedIndustries.length > 0 ||
                        sortBy !== 'recently_added') && (
                        <button
                          onClick={() => {
                            setSelectedIndustries([])
                            setSortBy('recently_added')
                            setIsFilterOpen(false)
                          }}
                          className={styleSheet.clear_filters_button}
                          style={isLight ? { color: '#040F1F' } : undefined}
                        >
                          Clear All
                        </button>
                      )}
                  </div>
                </div>

                {/* Filter Section */}
                <div className='col-lg-12'>
                  <div
                    className={`${styleSheet.filter_section} ${
                      isFilterOpen
                        ? styleSheet.filter_section_open
                        : styleSheet.filter_section_closed
                    }`}
                  >
                    {/* Filter button + inline Sort chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <FilterSortTrigger
                        count={selectedIndustries.length > 0 ? 1 : 0}
                        onClick={() => setShowFiltersModal(true)}
                      />
                      <SortByPills
                        groups={DEFAULT_SORT_GROUPS}
                        value={sortBy}
                        onChange={setSortBy}
                      />
                    </div>
                    <FilterSortModal
                      open={showFiltersModal}
                      onClose={() => setShowFiltersModal(false)}
                      defaultSortValue='recently_added'
                      filters={[
                        {
                          key: 'industry',
                          title: 'Industry',
                          options: Array.isArray(filterListData?.data?.industry)
                            ? filterListData.data.industry.map((industry: any) => ({
                                label: industry.name || industry,
                                value: String(industry.id ?? industry),
                              }))
                            : [],
                          selectedValues: selectedIndustries,
                          onChange: values => setSelectedIndustries(values),
                        },
                      ] as FilterSection[]}
                    />
                  </div>
                </div>

                <div className={styles.jobListing_job_list} ref={setScrollContainer}>
                  {(activeTab === 'all' ? companiesLoading : followingsLoading) ? (
                    <>
                      <JobCardSkeleton />
                      <JobCardSkeleton />
                      <JobCardSkeleton />
                    </>
                  ) : (activeTab === 'all' ? companiesError : followingsError) ? (
                    <div className='text-center py-8 text-red-400'>
                      Failed to load companies
                    </div>
                  ) : companiesToRender.length === 0 ? (
                    <div className='text-center' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '20px 0', minHeight: '60vh', width: '100%' }}>
                      <Image
                        src={BuildingIcon}
                        alt='No companies'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            width={24}
                        height={24}
                        style={{ opacity: 0.5, ...(isLight ? { filter: 'brightness(0) saturate(100%) invert(3%) sepia(15%) saturate(4962%) hue-rotate(186deg) brightness(97%) contrast(101%)' } : {}) }}
                      />
                      <p style={{ color: isLight ? '#040F1F' : 'rgb(144 161 185)', margin: 0, fontWeight: '600' }}>
                        No companies found
                      </p>
                      <p style={{ color: isLight ? '#555' : 'rgb(144 161 185)', margin: 0, fontSize: '12px' }}>
                        Try adjusting your search or filters
                      </p>
                    </div>
                  ) : (
                    companiesToRender.map((company: any) => (
                      <div
                        key={company.id}
                        className={`${styles.jobListing_job_item} card-hover cursor-pointer`}
                        onClick={() => navigateToCompany(company.id)}
                      >
                        <div
                          className={styles.jobListing_job_item_main}
                          style={{ alignItems: 'center' }}
                        >
                          <div className={styles.companyCardGroup}>
                          <div className={styles.jobListing_job_item_logo}>
                            <LogoWithFallback
                              src={company.logo_url}
                              name={company.name}
                              size={80}
                              borderRadius={12}
                              alt={company.name}
                            />
                          </div>

                          <div className='flex-1'>
                            <h3
                              className={styles.jobListing_job_item_title}
                              style={isLight ? { color: '#040F1F' } : undefined}
                            >
                              {company.name}
                            </h3>
                            {company.address && (isLight ? (
                              <p
                                className={
                                  jobstyles.light_side_profile_location
                                }
                              >
                                <span>
                                  <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    width={9}
                                    height={11}
                                    viewBox='0 0 9 10'
                                    fill='none'
                                  >
                                    <path
                                      d='M4.0885 9.21565C5.14818 8.26701 5.9591 7.3571 6.52126 6.48592C7.08342 5.61474 7.3645 4.85171 7.3645 4.19683C7.3645 3.20938 7.05078 2.3976 6.42335 1.7615C5.79592 1.1254 5.01764 0.807354 4.0885 0.807354C3.15936 0.807354 2.38108 1.1254 1.75365 1.7615C1.12622 2.3976 0.8125 3.20938 0.8125 4.19683C0.8125 4.85171 1.09358 5.61474 1.65574 6.48592C2.2179 7.3571 3.02882 8.26701 4.0885 9.21565ZM4.0885 9.98847C3.98297 9.98847 3.87743 9.97028 3.7719 9.9339C3.66627 9.89742 3.57076 9.841 3.48535 9.76463C2.9993 9.31667 2.54443 8.85535 2.12076 8.38067C1.69718 7.90608 1.32898 7.43162 1.01617 6.9573C0.703264 6.48298 0.455677 6.01286 0.273406 5.54694C0.0911355 5.08092 0 4.63089 0 4.19683C0 2.94685 0.404309 1.93488 1.21293 1.16093C2.02164 0.386975 2.98016 0 4.0885 0C5.19684 0 6.15536 0.386975 6.96407 1.16093C7.77269 1.93488 8.177 2.94685 8.177 4.19683C8.177 4.63089 8.08587 5.08002 7.90359 5.54423C7.72132 6.00853 7.47464 6.47869 7.16354 6.95473C6.85235 7.43076 6.48497 7.90522 6.06139 8.37809C5.6378 8.85106 5.18294 9.31148 4.69679 9.75934C4.61265 9.83572 4.517 9.893 4.40984 9.93119C4.30277 9.96938 4.19566 9.98847 4.0885 9.98847ZM4.08945 5.07284C4.35893 5.07284 4.58932 4.97688 4.78061 4.78495C4.972 4.59302 5.0677 4.36231 5.0677 4.09283C5.0677 3.82335 4.97173 3.59292 4.7798 3.40153C4.58787 3.21023 4.35712 3.11458 4.08755 3.11458C3.81807 3.11458 3.58768 3.21055 3.39639 3.40248C3.205 3.59441 3.1093 3.82516 3.1093 4.09473C3.1093 4.36421 3.20527 4.5946 3.3972 4.7859C3.58913 4.97719 3.81988 5.07284 4.08945 5.07284Z'
                                      fill='#3960FB'
                                    />
                                  </svg>
                                </span>
                                {company.address}
                              </p>
                            ) : (
                              <p className='location-badge-design'>
                              <span>
                                <svg
                                  xmlns='http://www.w3.org/2000/svg'
                                  width={9}
                                  height={11}
                                  viewBox='0 0 9 11'
                                  fill='none'
                                >
                                  <path
                                    d='M4.403 9.92454C5.54419 8.90293 6.41749 7.92303 7.0229 6.98483C7.6283 6.04664 7.931 5.22492 7.931 4.51967C7.931 3.45625 7.59315 2.58203 6.91746 1.897C6.24176 1.21197 5.40361 0.869458 4.403 0.869458C3.40239 0.869458 2.56424 1.21197 1.88854 1.897C1.21285 2.58203 0.875 3.45625 0.875 4.51967C0.875 5.22492 1.1777 6.04664 1.7831 6.98483C2.38851 7.92303 3.26181 8.90293 4.403 9.92454ZM4.403 10.7568C4.28935 10.7568 4.17569 10.7372 4.06204 10.698C3.94829 10.6588 3.84543 10.598 3.75346 10.5158C3.23001 10.0333 2.74016 9.53653 2.2839 9.02533C1.82773 8.51424 1.43121 8.00329 1.09433 7.49248C0.757361 6.98167 0.490729 6.47539 0.294438 5.97363C0.0981459 5.47176 0 4.98711 0 4.51967C0 3.17353 0.43541 2.08372 1.30623 1.25023C2.17715 0.416743 3.2094 0 4.403 0C5.5966 0 6.62885 0.416743 7.49977 1.25023C8.37059 2.08372 8.806 3.17353 8.806 4.51967C8.806 4.98711 8.70785 5.47079 8.51156 5.97071C8.31527 6.47072 8.04961 6.97706 7.71458 7.48971C7.37946 8.00236 6.98381 8.51331 6.52765 9.02256C6.07148 9.53191 5.58162 10.0277 5.05808 10.5101C4.96747 10.5923 4.86447 10.654 4.74906 10.6951C4.63376 10.7363 4.5184 10.7568 4.403 10.7568ZM4.40402 5.46306C4.69423 5.46306 4.94234 5.35972 5.14835 5.15302C5.35446 4.94633 5.45752 4.69788 5.45752 4.40767C5.45752 4.11746 5.35417 3.8693 5.14748 3.66319C4.94078 3.45717 4.69228 3.35417 4.40198 3.35417C4.11177 3.35417 3.86366 3.45751 3.65765 3.66421C3.45153 3.8709 3.34848 4.1194 3.34848 4.40971C3.34848 4.69992 3.45183 4.94803 3.65852 5.15404C3.86522 5.36006 4.11372 5.46306 4.40402 5.46306Z'
                                    fill='#A0AEC0'
                                  />
                                </svg>
                              </span>
                              {company.address}
                            </p>
                            ))}
                            <p
                              style={isLight ? { color: '#040F1F' } : {color: '#A0AEC0'}}
                              className={styles.jobListing_job_item_description}
                            >
                              {company.description
                                ? `${sliceWords(company.description)}${
                                    company.description.split(' ').length > 7
                                      ? '...'
                                      : ''
                                  }`
                                : ''}
                            </p>
                          </div>
                          </div>

                          <button
                            onClick={e =>
                              handleFollowToggle(
                                e,
                                company.id,
                                company.follow_status
                              )
                            }
                            disabled={isFollowPending(company.id)}
                            className={isLight
                              ? company.follow_status ? 'light-applied-btn' : 'light-apply-btn'
                              : `${mainstyles.jobDetails_job_item_btns} ${company.follow_status ? 'apply-btn' : 'btn-gradient'}`}
                          >
                            {isFollowPending(company.id)
                              ? pendingAction === 'follow'
                                ? 'Following...'
                                : 'Unfollowing...'
                              : company.follow_status
                              ? 'Following'
                              : 'Follow'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {activeTab === 'all' && hasNextPage && (
                    <div ref={observerRef} className='text-center py-6'>
                      {isFetchingNextPage && (
                        <div className='flex items-center justify-center py-6'>
                          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Unfollow Confirmation Modal */}
      <LogOutModal
        isOpen={showUnfollowModal}
        onClose={cancelUnfollow}
        title='Unfollow Company?'
        onConfirm={confirmUnfollow}
        confirmText='Yes, Unfollow'
        cancelText='Cancel'
      >
        Are you sure you want to unfollow this company?
      </LogOutModal>
      {authGateModal}
    </>
  )
}

export default CompaniesList
