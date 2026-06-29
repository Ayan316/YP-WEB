'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import styles from '@/moduleCss/events.module.css'
import styleSheet from '@/_assets/style/style.module.css'
import ProfileCardsmall from '../commonUI/ProfileCardsmall'
import SortByPills, { DEFAULT_SORT_GROUPS } from '../commonUI/SortByPills'
import FilterSortTrigger from '../commonUI/FilterSortTrigger'
import FilterSortModal, { FilterSection } from '../commonUI/FilterSortModal'
import EventCard from './EventCard'
import EventCardSkeleton from '../commonUI/loaders/skeletons/EventCardSkeleton'
import { useTheme } from '@/context/ThemeContext'
import useDebounce from '@/app/hooks/useDebounce'
import { getEvents, getMyBookings } from '@/services/events.services'
import { fetchFilterList } from '@/services/jobs.services'
import { useHasSession } from '@/app/hooks/useHasSession'
import { useListingPreserve } from '@/app/hooks/useListingPreserve'
import { useListingState } from '@/app/hooks/useListingState'

type EventTab = 'all' | 'bookings'

const EventListing = () => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const queryClient = useQueryClient()
  const { data: hasSession } = useHasSession()

  // Scroll restoration. Hook saves on scroll (throttled) and restores on
  // mount. saveBeforeNavigate is called inside any handler that triggers
  // a router.push (e.g. detail navigation) so the latest scrollY is
  // captured even between throttle ticks.
  const { saveBeforeNavigate, setScrollContainer } = useListingPreserve('event-list')

  // Persist UI state across back-navigation from /events/<id>.
  const [persisted, setPersisted] = useListingState('event-list', {
    activeTab: 'all' as EventTab,
    searchInput: '',
    sortBy: 'recently_added',
    selectedFilters: {
      event_type: [] as string[],
      company_id: [] as string[],
      pricing_type: [] as string[],
    },
  })

  // The booking-detail back button sets a one-shot intent to land on the
  // bookings tab; that takes precedence over the persisted blob. Resolved
  // once via useState's lazy initializer to avoid re-reading sessionStorage
  // on every render.
  const [activeTab, setActiveTab] = useState<EventTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('events_active_tab')
      if (saved === 'bookings') {
        sessionStorage.removeItem('events_active_tab')
        return 'bookings'
      }
    }
    return persisted.activeTab
  })
  const [searchInput, setSearchInput] = useState<string>(persisted.searchInput)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>(persisted.sortBy)
  const [selectedFilters, setSelectedFilters] = useState<{
    event_type: string[]
    company_id: string[]
    pricing_type: string[]
  }>(persisted.selectedFilters)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  useEffect(() => {
    setPersisted({ activeTab, searchInput, sortBy, selectedFilters })
  }, [activeTab, searchInput, sortBy, selectedFilters, setPersisted])

  const debouncedSearch = useDebounce(searchInput, 500)
  const observerTarget = useRef<HTMLDivElement>(null)

  const arrayToCommaSeparatedString = (arr: string[]): string | undefined => {
    if (!arr || arr.length === 0) return undefined
    return arr.join(', ')
  }

  /* ---------------- ALL EVENTS WITH INFINITE SCROLL ---------------- */
  const eventsFilters = activeTab === 'all' ? selectedFilters : { event_type: [], company_id: [], pricing_type: [] }
  const eventsSearch = activeTab === 'all' ? debouncedSearch : ''
  const eventsSortBy = activeTab === 'all' ? sortBy : 'recently_added'

  const {
    data: eventsData,
    isLoading: eventsLoading,
    hasNextPage: eventsHasNextPage,
    fetchNextPage: eventsFetchNextPage,
    isFetchingNextPage: eventsIsFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'events',
      {
        search: eventsSearch,
        filters: eventsFilters,
        sortBy: eventsSortBy,
      },
    ],
    queryFn: async ({ pageParam = 1 }) => {
      // Public read — events are browseable anonymously.
      return getEvents({
        limit: 10,
        page: pageParam,
        search_text: eventsSearch || undefined,
        company_ids: arrayToCommaSeparatedString(eventsFilters.company_id),
        pricing_type: eventsFilters.pricing_type.length === 1
          ? eventsFilters.pricing_type[0].toLowerCase()
          : undefined,
        event_type: arrayToCommaSeparatedString(eventsFilters.event_type),
        sort_by: eventsSortBy,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length
      const totalCount = lastPage?.data?.total_count || 0
      const totalPages = Math.ceil(totalCount / 10)
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1,
    enabled: activeTab === 'all',
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  /* ---------------- MY BOOKINGS (fetch all, filter client-side) ---------------- */
  const {
    data: bookingsRawData,
    isLoading: bookingsLoading,
  } = useQuery({
    queryKey: ['my-bookings-all'],
    queryFn: () => getMyBookings({ limit: 10000, page: 1 }),
    enabled: hasSession === true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  /* ---------------- EVENTS COUNT (fetched on mount for sidebar) -------- */
  const { data: eventsCountData } = useQuery({
    queryKey: ['events-count'],
    queryFn: () => getEvents({ limit: 1, page: 1 }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  /* ---------------- BOOKINGS COUNT (fetched on mount for sidebar) -------- */
  const { data: bookingsCountData } = useQuery({
    queryKey: ['my-bookings-count'],
    queryFn: () => getMyBookings({ limit: 1, page: 1 }),
    enabled: hasSession === true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  /* ---------------- FILTER LIST QUERY ---------------- */
  const { data: filterListData } = useQuery({
    queryKey: ['filter-list'],
    queryFn: fetchFilterList,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })

  /* ---------------- REFETCH ON RETURN (back nav / bfcache) ---------------- */
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['events'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['events-count'] })
    queryClient.invalidateQueries({ queryKey: ['my-bookings-all'] })
    queryClient.invalidateQueries({ queryKey: ['my-bookings-count'] })

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.invalidateQueries({ queryKey: ['events'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['events-count'] })
        queryClient.invalidateQueries({ queryKey: ['my-bookings-all'] })
        queryClient.invalidateQueries({ queryKey: ['my-bookings-count'] })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [queryClient])

  /* ---------------- FLATTEN EVENTS DATA ---------------- */
  const allEvents = eventsData?.pages?.flatMap(
    (page: any) => page?.data?.result || []
  ) || []

  const totalEventsCount = eventsData?.pages?.[0]?.data?.total_count
    ?? eventsCountData?.data?.total_count
    ?? 0

  const upcomingBookingsCount = useMemo(() => {
    const raw = bookingsRawData?.data?.bookings || bookingsRawData?.data?.result
    if (!Array.isArray(raw)) return null
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return raw.filter((booking: any) => {
      const event = booking.event || booking
      const eventDateStr = event.end_datetime || event.start_datetime
      if (!eventDateStr) return true
      const eventDate = new Date(eventDateStr)
      if (isNaN(eventDate.getTime())) return true
      return eventDate.getTime() >= startOfToday.getTime()
    }).length
  }, [bookingsRawData])

  // Placeholder — recomputed below once `allBookings` (the filtered list) is
  // available, so the sidebar "My Bookings (n)" matches what's actually
  // rendered (e.g. 0 when filters yield no results).
  let totalBookingsCount: number =
    upcomingBookingsCount
    ?? bookingsRawData?.data?.total_count
    ?? bookingsCountData?.data?.total_count
    ?? bookingsCountData?.total_count
    ?? 0

  /* ---------------- CLIENT-SIDE SEARCH & FILTER FOR BOOKINGS ---------------- */
  const allBookings = useMemo(() => {
    const raw = bookingsRawData?.data?.bookings || bookingsRawData?.data?.result || []
    if (!Array.isArray(raw) || raw.length === 0) return raw

    // Hide past events — only today and future
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    let filtered = raw.filter((booking: any) => {
      const event = booking.event || booking
      const eventDateStr = event.end_datetime || event.start_datetime
      if (!eventDateStr) return true
      const eventDate = new Date(eventDateStr)
      if (isNaN(eventDate.getTime())) return true
      return eventDate.getTime() >= startOfToday.getTime()
    })

    // Search filter
    if (debouncedSearch && debouncedSearch.trim() !== '') {
      const search = debouncedSearch.toLowerCase().trim()
      filtered = filtered.filter((booking: any) => {
        const event = booking.event || booking
        const title = (event.title || '').toLowerCase()
        const location = (event.location || '').toLowerCase()
        const platformName = (event.platform_name || '').toLowerCase()
        const companyName = (event.company_name || '').toLowerCase()
        return (
          title.includes(search) ||
          location.includes(search) ||
          platformName.includes(search) ||
          companyName.includes(search)
        )
      })
    }

    // Event type filter
    if (selectedFilters.event_type.length > 0) {
      filtered = filtered.filter((booking: any) => {
        const event = booking.event || booking
        // Determine event type value: '1' for Virtual, '0' for In-Person
        let eventTypeStr: string
        if (event.event_type !== null && event.event_type !== undefined) {
          eventTypeStr = String(event.event_type)
        } else {
          eventTypeStr = event.event_type_display === 'Virtual' ? '1' : '0'
        }
        return selectedFilters.event_type.includes(eventTypeStr)
      })
    }

    // Company filter
    if (selectedFilters.company_id.length > 0) {
      filtered = filtered.filter((booking: any) => {
        const event = booking.event || booking
        const companyId = String(event.company_id || event.company?.id || '')
        return selectedFilters.company_id.includes(companyId)
      })
    }

    // Pricing type filter
    if (selectedFilters.pricing_type.length === 1) {
      const pricingFilter = selectedFilters.pricing_type[0].toLowerCase()
      filtered = filtered.filter((booking: any) => {
        const event = booking.event || booking
        const pricingType = (event.pricing_type || '').toLowerCase()
        return pricingType === pricingFilter
      })
    }

    // Sort
    if (sortBy === 'a_to_z') {
      filtered.sort((a: any, b: any) => {
        const titleA = (a.event?.title || a.title || '').toLowerCase()
        const titleB = (b.event?.title || b.title || '').toLowerCase()
        return titleA.localeCompare(titleB)
      })
    } else if (sortBy === 'z_to_a') {
      filtered.sort((a: any, b: any) => {
        const titleA = (a.event?.title || a.title || '').toLowerCase()
        const titleB = (b.event?.title || b.title || '').toLowerCase()
        return titleB.localeCompare(titleA)
      })
    }

    return filtered
  }, [bookingsRawData, debouncedSearch, selectedFilters, sortBy])

  // Sidebar count must reflect what's actually rendered, so when a search /
  // filter / sort drops the bookings to 0 the badge shows 0 instead of the
  // stale raw upcoming count.
  totalBookingsCount = Array.isArray(allBookings) ? allBookings.length : totalBookingsCount

  /* ---------------- INTERSECTION OBSERVER FOR INFINITE SCROLL (All Events only) ---------------- */
  useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          if (activeTab === 'all' && eventsHasNextPage && !eventsIsFetchingNextPage) {
            eventsFetchNextPage()
          }
        }
      },
      { threshold: 0.1 }
    )

    const current = observerTarget.current
    observer.observe(current)

    return () => {
      if (current) observer.unobserve(current)
    }
  }, [eventsHasNextPage, eventsIsFetchingNextPage, eventsFetchNextPage, activeTab])

  /* ---------------- TAB CHANGE HANDLER ---------------- */
  const handleTabChange = (tab: EventTab) => {
    setActiveTab(tab)
    setSearchInput('')
    setSortBy('recently_added')
    setSelectedFilters({
      event_type: [],
      company_id: [],
      pricing_type: [],
    })
    setIsFilterOpen(false)
  }

  /* ---------------- FILTER HANDLERS ---------------- */
  const handleFilterChange = (
    filterType: keyof typeof selectedFilters,
    values: string[]
  ) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: values,
    }))
  }

  const clearAllFilters = () => {
    setSelectedFilters({
      event_type: [],
      company_id: [],
      pricing_type: [],
    })
    setSortBy('recently_added')
    setSearchInput('')
    queryClient.invalidateQueries({ queryKey: ['events'], exact: false })
  }

  const hasAnyFilterSelected = () => {
    return Object.values(selectedFilters).some(filter => filter.length > 0) || sortBy !== 'recently_added'
  }

  const handleClearSearch = () => {
    setSearchInput('')
  }

  const isLoading = activeTab === 'all' ? eventsLoading : bookingsLoading

  return (
    <div className='container mx-auto px-4'>
      <div
        className={`${styles.eventListing_main_section_wrapper} max-content-height`}
      >
        <div
          className='flex flex-wrap gap-y-4 -mx-2 mt-6'
          style={{ height: '100%' }}
        >
          {/* Sidebar */}
          <div
            className='full-width-midium col-lg-4'
            style={{ height: '100%' }}
          >
            <aside className={styles.sidebar_main_section}>
              {/* Profile Card */}
              <ProfileCardsmall />

              {/* Navigation */}
              <div className={styles.side_event_navigation}>
                {isLoading ? (
                  <>
                    <div style={{ width: '55%', height: 14, borderRadius: 6, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', animation: 'sidebarPulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: '65%', height: 14, borderRadius: 6, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', animation: 'sidebarPulse 1.5s ease-in-out infinite' }} />
                    <style>{`@keyframes sidebarPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleTabChange('all')}
                      className={`${styles.side_event_navigation_btn} ${
                        activeTab === 'all' ? styles.active : ''
                      }`}
                      style={
                        isLight
                          ? activeTab === 'all'
                            ? { fontWeight: 600, color: '#040F1F' }
                            : { color: '#888888' }
                          : undefined
                      }
                    >
                      All Events ({totalEventsCount})
                    </button>
                    <button
                      onClick={() => handleTabChange('bookings')}
                      className={`${styles.side_event_navigation_btn} ${
                        activeTab === 'bookings' ? styles.active : ''
                      }`}
                      style={
                        isLight
                          ? activeTab === 'bookings'
                            ? { fontWeight: 600, color: '#040F1F' }
                            : { color: '#888888' }
                          : undefined
                      }
                    >
                      My Bookings ({totalBookingsCount})
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>

          {/* Main Content */}
          <div className='full-width-midium col-lg-8'>
            <main className={styles.eventListing_main_section}>
              <div className={styles.eventListing_job_list_header}>
                <div className='col-lg-6'>
                  <div className={styles.eventListing_job_list_header_left}>
                    <h1
                      className={styles.eventListing_main_section_title}
                      style={isLight ? { color: '#040F1F' } : undefined}
                      // activeTab is restored from sessionStorage on the client
                      // (client-only) so this heading differs from the SSR
                      // default. Recoverable; suppress the hydration warning.
                      suppressHydrationWarning
                    >
                      {activeTab === 'all' ? 'All Events' : 'My Bookings'}
                    </h1>
                  </div>
                </div>
                <div className='col-lg-6 search-flex'>
                  <div className={styleSheet.search_panel_area}>
                    <form
                      onSubmit={e => e.preventDefault()}
                      className={styleSheet.search_form}
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
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className={styleSheet.search_panel}
                        suppressHydrationWarning
                      />
                      {searchInput && (
                        <button
                          type='button'
                          onClick={handleClearSearch}
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
                          <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 640 640"  style={{transform: "rotate(180deg)", fill: isLight? "#000": "#fff"}} ><path d="M352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160L384 160C401.7 160 416 145.7 416 128C416 110.3 401.7 96 384 96L352 96zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288L448 288C465.7 288 480 273.7 480 256C480 238.3 465.7 224 448 224L352 224zM352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416L512 416C529.7 416 544 401.7 544 384C544 366.3 529.7 352 512 352L352 352zM352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544L576 544C593.7 544 608 529.7 608 512C608 494.3 593.7 480 576 480L352 480zM182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4z" /></svg>
                        </span>
                    </form>
                  </div>
                  {isFilterOpen && hasAnyFilterSelected() && (
                    <button
                      onClick={() => {
                        clearAllFilters()
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <FilterSortTrigger
                        count={
                          (selectedFilters.company_id.length > 0 ? 1 : 0) +
                          (selectedFilters.event_type.length > 0 ? 1 : 0) +
                          (selectedFilters.pricing_type.length > 0 ? 1 : 0)
                        }
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
                          key: 'company_id',
                          title: 'Company',
                          options: Array.isArray(filterListData?.data?.company)
                            ? filterListData.data.company.map((company: any) => ({
                                label: company.name || company,
                                value: String(company.id || company.name || company),
                              }))
                            : [],
                          selectedValues: selectedFilters.company_id,
                          onChange: values => handleFilterChange('company_id', values),
                        },
                        {
                          key: 'event_type',
                          title: 'Event Type',
                          options: [
                            { label: 'Virtual Event', value: '1' },
                            { label: 'Physical Event', value: '0' },
                          ],
                          selectedValues: selectedFilters.event_type,
                          onChange: values => handleFilterChange('event_type', values),
                        },
                        {
                          key: 'pricing_type',
                          title: 'Price',
                          options: [
                            { label: 'Free', value: 'free' },
                            { label: 'Paid', value: 'paid' },
                          ],
                          selectedValues: selectedFilters.pricing_type,
                          onChange: values => handleFilterChange('pricing_type', values),
                        },
                      ] as FilterSection[]}
                    />
                  </div>
                </div>

              {/* Event Cards / Bookings List */}
              <div className={styles.eventListing_event_list} ref={setScrollContainer}>
                {isLoading ? (
                  <EventCardSkeleton count={3} />
                ) : activeTab === 'all' ? (
                  <>
                    {allEvents.length === 0 ? (
                      <div className='text-center' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '20px 0', minHeight: '60vh', width: '100%' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 34 34" fill="none" style={{ opacity: 0.5 }}>
  <path d="M14.875 10.2708C14.6871 10.2708 14.507 10.3454 14.3741 10.4783C14.2413 10.6111 14.1667 10.7913 14.1667 10.9791C14.1667 11.167 14.2413 11.3472 14.3741 11.48C14.507 11.6129 14.6871 11.6875 14.875 11.6875H19.125C19.3129 11.6875 19.493 11.6129 19.6259 11.48C19.7587 11.3472 19.8333 11.167 19.8333 10.9791C19.8333 10.7913 19.7587 10.6111 19.6259 10.4783C19.493 10.3454 19.3129 10.2708 19.125 10.2708H14.875ZM13.4583 18.0625C13.4583 18.4382 13.3091 18.7985 13.0434 19.0642C12.7777 19.3299 12.4174 19.4791 12.0417 19.4791C11.6659 19.4791 11.3056 19.3299 11.0399 19.0642C10.7743 18.7985 10.625 18.4382 10.625 18.0625C10.625 17.6868 10.7743 17.3264 11.0399 17.0607C11.3056 16.7951 11.6659 16.6458 12.0417 16.6458C12.4174 16.6458 12.7777 16.7951 13.0434 17.0607C13.3091 17.3264 13.4583 17.6868 13.4583 18.0625ZM13.4583 23.0208C13.4583 23.3965 13.3091 23.7569 13.0434 24.0225C12.7777 24.2882 12.4174 24.4375 12.0417 24.4375C11.6659 24.4375 11.3056 24.2882 11.0399 24.0225C10.7743 23.7569 10.625 23.3965 10.625 23.0208C10.625 22.6451 10.7743 22.2848 11.0399 22.0191C11.3056 21.7534 11.6659 21.6041 12.0417 21.6041C12.4174 21.6041 12.7777 21.7534 13.0434 22.0191C13.3091 22.2848 13.4583 22.6451 13.4583 23.0208ZM17 19.4791C17.3757 19.4791 17.7361 19.3299 18.0017 19.0642C18.2674 18.7985 18.4167 18.4382 18.4167 18.0625C18.4167 17.6868 18.2674 17.3264 18.0017 17.0607C17.7361 16.7951 17.3757 16.6458 17 16.6458C16.6243 16.6458 16.2639 16.7951 15.9983 17.0607C15.7326 17.3264 15.5833 17.6868 15.5833 18.0625C15.5833 18.4382 15.7326 18.7985 15.9983 19.0642C16.2639 19.3299 16.6243 19.4791 17 19.4791ZM18.4167 23.0208C18.4167 23.3965 18.2674 23.7569 18.0017 24.0225C17.7361 24.2882 17.3757 24.4375 17 24.4375C16.6243 24.4375 16.2639 24.2882 15.9983 24.0225C15.7326 23.7569 15.5833 23.3965 15.5833 23.0208C15.5833 22.6451 15.7326 22.2848 15.9983 22.0191C16.2639 21.7534 16.6243 21.6041 17 21.6041C17.3757 21.6041 17.7361 21.7534 18.0017 22.0191C18.2674 22.2848 18.4167 22.6451 18.4167 23.0208ZM21.9583 19.4791C22.3341 19.4791 22.6944 19.3299 22.9601 19.0642C23.2257 18.7985 23.375 18.4382 23.375 18.0625C23.375 17.6868 23.2257 17.3264 22.9601 17.0607C22.6944 16.7951 22.3341 16.6458 21.9583 16.6458C21.5826 16.6458 21.2223 16.7951 20.9566 17.0607C20.6909 17.3264 20.5417 17.6868 20.5417 18.0625C20.5417 18.4382 20.6909 18.7985 20.9566 19.0642C21.2223 19.3299 21.5826 19.4791 21.9583 19.4791Z" fill={isLight ? '#888' : '#a0aec0'} />
  <path fillRule="evenodd" clipRule="evenodd" d="M11.3333 4.95831C11.5212 4.95831 11.7014 5.03294 11.8342 5.16578C11.967 5.29862 12.0417 5.47878 12.0417 5.66665V7.08331H21.9583V5.66665C21.9583 5.47878 22.033 5.29862 22.1658 5.16578C22.2986 5.03294 22.4788 4.95831 22.6667 4.95831C22.8545 4.95831 23.0347 5.03294 23.1675 5.16578C23.3004 5.29862 23.375 5.47878 23.375 5.66665V7.08756C23.7216 7.0904 24.0304 7.10267 24.3015 7.1244C24.8186 7.1669 25.2719 7.25615 25.6912 7.46865C26.3575 7.8085 26.899 8.35053 27.2382 9.01706C27.4522 9.4364 27.5414 9.88973 27.5839 10.4054C27.625 10.9083 27.625 11.5274 27.625 12.2952V23.1214C27.625 23.8892 27.625 24.5097 27.5839 25.0098C27.5414 25.5269 27.4522 25.9802 27.2382 26.3996C26.8988 27.0656 26.3573 27.6071 25.6912 27.9466C25.2719 28.1605 24.8186 28.2497 24.3029 28.2922C23.8 28.3333 23.1809 28.3333 22.4145 28.3333H11.5869C10.8191 28.3333 10.1986 28.3333 9.6985 28.2922C9.18142 28.2497 8.72808 28.1605 8.30875 27.9466C7.64222 27.6073 7.10018 27.0658 6.76033 26.3996C6.54783 25.9802 6.45858 25.5269 6.41608 25.0112C6.375 24.5083 6.375 23.8878 6.375 23.12V12.2966C6.375 11.6237 6.375 11.067 6.40333 10.6009L6.41608 10.4082C6.45858 9.89115 6.54783 9.43781 6.76033 9.01848C7.09994 8.35173 7.642 7.80967 8.30875 7.47006C8.72808 7.25756 9.18142 7.16831 9.69708 7.12581C9.97003 7.10409 10.2793 7.09181 10.625 7.08898V5.66665C10.625 5.47878 10.6996 5.29862 10.8325 5.16578C10.9653 5.03294 11.1455 4.95831 11.3333 4.95831ZM10.625 9.20831V8.50423C10.3541 8.50646 10.0834 8.51733 9.81325 8.53681C9.38542 8.57081 9.13892 8.63598 8.95192 8.7309C8.55172 8.93469 8.22638 9.26003 8.02258 9.66023C7.92767 9.84723 7.8625 10.0937 7.8285 10.5216C7.79167 10.9593 7.79167 11.5203 7.79167 12.325V13.1041H26.2083V12.325C26.2083 11.5203 26.2083 10.9593 26.1715 10.5216C26.1375 10.0937 26.0723 9.84723 25.9774 9.66023C25.7736 9.26003 25.4483 8.93469 25.0481 8.7309C24.8611 8.63598 24.6146 8.57081 24.1867 8.53681C23.9166 8.51733 23.6459 8.50646 23.375 8.50423V9.20831C23.375 9.39617 23.3004 9.57634 23.1675 9.70918C23.0347 9.84202 22.8545 9.91665 22.6667 9.91665C22.4788 9.91665 22.2986 9.84202 22.1658 9.70918C22.033 9.57634 21.9583 9.39617 21.9583 9.20831V8.49998H12.0417V9.20831C12.0417 9.39617 11.967 9.57634 11.8342 9.70918C11.7014 9.84202 11.5212 9.91665 11.3333 9.91665C11.1455 9.91665 10.9653 9.84202 10.8325 9.70918C10.6996 9.57634 10.625 9.39617 10.625 9.20831ZM26.2083 14.5208H7.79167V23.0916C7.79167 23.8963 7.79167 24.4587 7.8285 24.8951C7.8625 25.3229 7.92767 25.5694 8.02258 25.7564C8.22638 26.1566 8.55172 26.4819 8.95192 26.6857C9.13892 26.7806 9.38542 26.8458 9.81325 26.8798C10.251 26.9166 10.812 26.9166 11.6167 26.9166H22.3833C23.188 26.9166 23.7504 26.9166 24.1867 26.8798C24.6146 26.8458 24.8611 26.7806 25.0481 26.6857C25.4483 26.4819 25.7736 26.1566 25.9774 25.7564C26.0723 25.5694 26.1375 25.3229 26.1715 24.8951C26.2083 24.4587 26.2083 23.8963 26.2083 23.0916V14.5208Z" fill={isLight ? '#888' : '#a0aec0'} />
</svg>
                        <p style={{ color: isLight ? '#040F1F' : 'rgb(144 161 185)', margin: 0, fontWeight: '600' }}>
                          No events found
                        </p>
                        <p style={{ color: isLight ? '#555' : 'rgb(144 161 185)', margin: 0, fontSize: '12px' }}>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    ) : (
                      <div className={styles.event_cards_grid}>
                        {allEvents.map((event: any) => (
                          <EventCard
                            key={event.id}
                            id={event.id}
                            banner_image_url={event.banner_image_url}
                            sidebar_image_url={event.sidebar_image_url}
                            title={event.title}
                            start_datetime={event.start_datetime}
                            end_datetime={event.end_datetime}
                            location={event.location}
                            platform_name={event.platform_name}
                            offer_price={event.offer_price}
                            list_price={event.list_price}
                            event_type_display={event.event_type_display}
                            pricing_type={event.pricing_type}
                            availability_status={event.availability_status}
                            is_booked={event.booking_status === 'confirmed'}
                            bookingStatus={event.booking_status}
                            external_registration_url={event.external_registration_url}
                            onBeforeNavigate={saveBeforeNavigate}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {allBookings.length === 0 ? (
                      <div className='flex items-center justify-center' style={{ minHeight: '60vh', width: '100%' }}>
                        <p style={{ color: isLight ? '#555' : '#a0aec0', fontSize: '14px', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                          <span>
                           <svg xmlns="http://www.w3.org/2000/svg" width={34} height={34} viewBox="0 0 34 34" fill="none">
  <path d="M14.875 10.2708C14.6871 10.2708 14.507 10.3454 14.3741 10.4783C14.2413 10.6111 14.1667 10.7913 14.1667 10.9791C14.1667 11.167 14.2413 11.3472 14.3741 11.48C14.507 11.6129 14.6871 11.6875 14.875 11.6875H19.125C19.3129 11.6875 19.493 11.6129 19.6259 11.48C19.7587 11.3472 19.8333 11.167 19.8333 10.9791C19.8333 10.7913 19.7587 10.6111 19.6259 10.4783C19.493 10.3454 19.3129 10.2708 19.125 10.2708H14.875ZM13.4583 18.0625C13.4583 18.4382 13.3091 18.7985 13.0434 19.0642C12.7777 19.3299 12.4174 19.4791 12.0417 19.4791C11.6659 19.4791 11.3056 19.3299 11.0399 19.0642C10.7743 18.7985 10.625 18.4382 10.625 18.0625C10.625 17.6868 10.7743 17.3264 11.0399 17.0607C11.3056 16.7951 11.6659 16.6458 12.0417 16.6458C12.4174 16.6458 12.7777 16.7951 13.0434 17.0607C13.3091 17.3264 13.4583 17.6868 13.4583 18.0625ZM13.4583 23.0208C13.4583 23.3965 13.3091 23.7569 13.0434 24.0225C12.7777 24.2882 12.4174 24.4375 12.0417 24.4375C11.6659 24.4375 11.3056 24.2882 11.0399 24.0225C10.7743 23.7569 10.625 23.3965 10.625 23.0208C10.625 22.6451 10.7743 22.2848 11.0399 22.0191C11.3056 21.7534 11.6659 21.6041 12.0417 21.6041C12.4174 21.6041 12.7777 21.7534 13.0434 22.0191C13.3091 22.2848 13.4583 22.6451 13.4583 23.0208ZM17 19.4791C17.3757 19.4791 17.7361 19.3299 18.0017 19.0642C18.2674 18.7985 18.4167 18.4382 18.4167 18.0625C18.4167 17.6868 18.2674 17.3264 18.0017 17.0607C17.7361 16.7951 17.3757 16.6458 17 16.6458C16.6243 16.6458 16.2639 16.7951 15.9983 17.0607C15.7326 17.3264 15.5833 17.6868 15.5833 18.0625C15.5833 18.4382 15.7326 18.7985 15.9983 19.0642C16.2639 19.3299 16.6243 19.4791 17 19.4791ZM18.4167 23.0208C18.4167 23.3965 18.2674 23.7569 18.0017 24.0225C17.7361 24.2882 17.3757 24.4375 17 24.4375C16.6243 24.4375 16.2639 24.2882 15.9983 24.0225C15.7326 23.7569 15.5833 23.3965 15.5833 23.0208C15.5833 22.6451 15.7326 22.2848 15.9983 22.0191C16.2639 21.7534 16.6243 21.6041 17 21.6041C17.3757 21.6041 17.7361 21.7534 18.0017 22.0191C18.2674 22.2848 18.4167 22.6451 18.4167 23.0208ZM21.9583 19.4791C22.3341 19.4791 22.6944 19.3299 22.9601 19.0642C23.2257 18.7985 23.375 18.4382 23.375 18.0625C23.375 17.6868 23.2257 17.3264 22.9601 17.0607C22.6944 16.7951 22.3341 16.6458 21.9583 16.6458C21.5826 16.6458 21.2223 16.7951 20.9566 17.0607C20.6909 17.3264 20.5417 17.6868 20.5417 18.0625C20.5417 18.4382 20.6909 18.7985 20.9566 19.0642C21.2223 19.3299 21.5826 19.4791 21.9583 19.4791Z" fill={isLight ? '#555' : '#a0aec0'} />
  <path fillRule="evenodd" clipRule="evenodd" d="M11.3333 4.95831C11.5212 4.95831 11.7014 5.03294 11.8342 5.16578C11.967 5.29862 12.0417 5.47878 12.0417 5.66665V7.08331H21.9583V5.66665C21.9583 5.47878 22.033 5.29862 22.1658 5.16578C22.2986 5.03294 22.4788 4.95831 22.6667 4.95831C22.8545 4.95831 23.0347 5.03294 23.1675 5.16578C23.3004 5.29862 23.375 5.47878 23.375 5.66665V7.08756C23.7216 7.0904 24.0304 7.10267 24.3015 7.1244C24.8186 7.1669 25.2719 7.25615 25.6912 7.46865C26.3575 7.8085 26.899 8.35053 27.2382 9.01706C27.4522 9.4364 27.5414 9.88973 27.5839 10.4054C27.625 10.9083 27.625 11.5274 27.625 12.2952V23.1214C27.625 23.8892 27.625 24.5097 27.5839 25.0098C27.5414 25.5269 27.4522 25.9802 27.2382 26.3996C26.8988 27.0656 26.3573 27.6071 25.6912 27.9466C25.2719 28.1605 24.8186 28.2497 24.3029 28.2922C23.8 28.3333 23.1809 28.3333 22.4145 28.3333H11.5869C10.8191 28.3333 10.1986 28.3333 9.6985 28.2922C9.18142 28.2497 8.72808 28.1605 8.30875 27.9466C7.64222 27.6073 7.10018 27.0658 6.76033 26.3996C6.54783 25.9802 6.45858 25.5269 6.41608 25.0112C6.375 24.5083 6.375 23.8878 6.375 23.12V12.2966C6.375 11.6237 6.375 11.067 6.40333 10.6009L6.41608 10.4082C6.45858 9.89115 6.54783 9.43781 6.76033 9.01848C7.09994 8.35173 7.642 7.80967 8.30875 7.47006C8.72808 7.25756 9.18142 7.16831 9.69708 7.12581C9.97003 7.10409 10.2793 7.09181 10.625 7.08898V5.66665C10.625 5.47878 10.6996 5.29862 10.8325 5.16578C10.9653 5.03294 11.1455 4.95831 11.3333 4.95831ZM10.625 9.20831V8.50423C10.3541 8.50646 10.0834 8.51733 9.81325 8.53681C9.38542 8.57081 9.13892 8.63598 8.95192 8.7309C8.55172 8.93469 8.22638 9.26003 8.02258 9.66023C7.92767 9.84723 7.8625 10.0937 7.8285 10.5216C7.79167 10.9593 7.79167 11.5203 7.79167 12.325V13.1041H26.2083V12.325C26.2083 11.5203 26.2083 10.9593 26.1715 10.5216C26.1375 10.0937 26.0723 9.84723 25.9774 9.66023C25.7736 9.26003 25.4483 8.93469 25.0481 8.7309C24.8611 8.63598 24.6146 8.57081 24.1867 8.53681C23.9166 8.51733 23.6459 8.50646 23.375 8.50423V9.20831C23.375 9.39617 23.3004 9.57634 23.1675 9.70918C23.0347 9.84202 22.8545 9.91665 22.6667 9.91665C22.4788 9.91665 22.2986 9.84202 22.1658 9.70918C22.033 9.57634 21.9583 9.39617 21.9583 9.20831V8.49998H12.0417V9.20831C12.0417 9.39617 11.967 9.57634 11.8342 9.70918C11.7014 9.84202 11.5212 9.91665 11.3333 9.91665C11.1455 9.91665 10.9653 9.84202 10.8325 9.70918C10.6996 9.57634 10.625 9.39617 10.625 9.20831ZM26.2083 14.5208H7.79167V23.0916C7.79167 23.8963 7.79167 24.4587 7.8285 24.8951C7.8625 25.3229 7.92767 25.5694 8.02258 25.7564C8.22638 26.1566 8.55172 26.4819 8.95192 26.6857C9.13892 26.7806 9.38542 26.8458 9.81325 26.8798C10.251 26.9166 10.812 26.9166 11.6167 26.9166H22.3833C23.188 26.9166 23.7504 26.9166 24.1867 26.8798C24.6146 26.8458 24.8611 26.7806 25.0481 26.6857C25.4483 26.4819 25.7736 26.1566 25.9774 25.7564C26.0723 25.5694 26.1375 25.3229 26.1715 24.8951C26.2083 24.4587 26.2083 23.8963 26.2083 23.0916V14.5208Z" fill={isLight ? '#555' : '#a0aec0'} />
</svg>

                          </span>
                          No bookings found.
                          
                        </p>
                      </div>
                    ) : (
                      <div className={styles.event_cards_grid}>
                        {allBookings.map((booking: any) => {
                          const event = booking.event || booking
                          return (
                            <EventCard
                              key={booking.booking_id || booking.id}
                              id={event.id}
                              banner_image_url={event.banner_image_url || ''}
                              sidebar_image_url={event.sidebar_image_url}
                              title={event.title || ''}
                              start_datetime={event.start_datetime || ''}
                              end_datetime={event.end_datetime || ''}
                              location={event.location || null}
                              platform_name={event.platform_name || null}
                              offer_price={booking.total_amount ?? event.offer_price ?? null}
                              list_price={event.list_price || '0'}
                              event_type_display={event.event_type_display || ''}
                              pricing_type={event.pricing_type}
                              availability_status={event.availability_status}
                              bookingId={booking.booking_id}
                              bookingStatus={booking.booking_status}
                              numSeats={booking.num_seats}
                              bookingNumber={booking.booking_number}
                              external_registration_url={event.external_registration_url}
                              onBeforeNavigate={saveBeforeNavigate}
                            />
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Infinite Scroll Sentinel */}
                {activeTab === 'all' && eventsHasNextPage && (
                  <div ref={observerTarget} className='text-center py-6'>
                    {eventsIsFetchingNextPage && (
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
  )
}

export default EventListing
