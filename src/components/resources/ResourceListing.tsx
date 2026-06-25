'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import styles from '@/moduleCss/resources.module.css'
import styleSheet from '@/_assets/style/style.module.css'
import ProfileCardsmall from '../commonUI/ProfileCardsmall'
import SortByPills, { DEFAULT_SORT_GROUPS } from '../commonUI/SortByPills'
import ResourceCard from './ResourceCard'
import ResourceCategoryFilter from './ResourceCategoryFilter'
import ResourceCardSkeleton from '../commonUI/loaders/skeletons/ResourceCardSkeleton'
import { useTheme } from '@/context/ThemeContext'
import useDebounce from '@/app/hooks/useDebounce'
import { getResourceCategories, getResources } from '@/services/resources.services'
import type {
  ResourceCategory,
  ResourceListItem,
} from '@/types/resources'
import { useListingPreserve } from '@/app/hooks/useListingPreserve'
import { useListingState } from '@/app/hooks/useListingState'

const PAGE_LIMIT = 10

const ResourceListing = () => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const queryClient = useQueryClient()

  // Scroll restoration (mirrors EventListing): saveBeforeNavigate is called on
  // card click; setScrollContainer is attached to the scrolling list.
  // resetOnReload: a hard refresh starts at the top (initial phase) instead of
  // restoring the previous session's scroll, while back-navigation from a
  // resource detail page still restores position.
  const { saveBeforeNavigate, setScrollContainer } =
    useListingPreserve('resource-list', { resetOnReload: true })

  // Persist UI state across back-navigation from /resources/<id>.
  const [persisted, setPersisted] = useListingState('resource-list', {
    searchInput: '',
    category: 'all' as string,
    sortBy: 'recently_added' as string,
  })

  const [searchInput, setSearchInput] = useState<string>(persisted.searchInput)
  const [category, setCategory] = useState<string>(persisted.category)
  const [sortBy, setSortBy] = useState<string>(persisted.sortBy)
  // Collapsible sort panel toggled from the search-bar icon (mirrors the
  // Jobs/Events filter section — resources have no filters, only sorting).
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // On hard refresh (or first mount), scroll to the top so the page doesn't
  // retain the browser's cached scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    setPersisted({ searchInput, category, sortBy })
  }, [searchInput, category, sortBy, setPersisted])

  const debouncedSearch = useDebounce(searchInput, 500)
  const observerTarget = useRef<HTMLDivElement>(null)

  /* ---------------- CATEGORY FILTER LIST ---------------- */
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
  } = useQuery({
    queryKey: ['resource-categories'],
    queryFn: getResourceCategories,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })

  const categories: ResourceCategory[] =
    categoriesData?.status === 'OK' && Array.isArray(categoriesData?.data)
      ? categoriesData.data
      : []

  // Show the tab-list skeleton on the initial load (page refresh — no cached
  // categories yet) and while new categories are being fetched for the first
  // time. A background refetch that already has data keeps the list visible so
  // newly-added categories simply appear without a flash.
  const categoriesPending =
    categoriesLoading || (categoriesFetching && categories.length === 0)

  /* ---------------- RESOURCES WITH INFINITE SCROLL ---------------- */
  const {
    data: resourcesData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['resources', { search: debouncedSearch, category, sortBy }],
    queryFn: async ({ pageParam = 1 }) => {
      // Public read — resources are browseable anonymously. Never calls the
      // detail endpoint (that increments view_count).
      return getResources({
        page: pageParam,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
        category: category !== 'all' ? category : undefined,
        // 'recently_added' is the API default — omit sort_by for it.
        sort_by: sortBy !== 'recently_added' ? sortBy : undefined,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length
      const totalCount =
        lastPage?.status === 'OK' ? lastPage?.data?.total_count || 0 : 0
      const totalPages = Math.ceil(totalCount / PAGE_LIMIT)
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  /* ---------------- REFETCH ON RETURN (back nav / bfcache) ---------------- */
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['resources'], exact: false })

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.invalidateQueries({ queryKey: ['resources'], exact: false })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [queryClient])

  /* ---------------- FLATTEN RESOURCES DATA ---------------- */
  const allResources: ResourceListItem[] =
    resourcesData?.pages?.flatMap((page) =>
      page?.status === 'OK' ? page?.data?.result || [] : []
    ) || []

  /* ---------------- INTERSECTION OBSERVER (infinite scroll) ---------------- */
  useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const current = observerTarget.current
    observer.observe(current)

    return () => {
      if (current) observer.unobserve(current)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleClearSearch = () => setSearchInput('')

  return (
    <div className="container mx-auto px-4">
      <div
        className={`${styles.resourceListing_main_section_wrapper} max-content-height`}
      >
        <div
          className="flex flex-wrap gap-y-4 -mx-2 mt-6"
          style={{ height: '100%' }}
        >
          {/* Sidebar */}
          <div className="full-width-midium col-lg-4" style={{ height: '100%' }}>
            <aside className={styles.sidebar_main_section}>
              <ProfileCardsmall />
              <ResourceCategoryFilter
                categories={categories}
                selected={category}
                onSelect={setCategory}
                loading={categoriesPending}
              />
            </aside>
          </div>

          {/* Main Content */}
          <div className="full-width-midium col-lg-8" style={{ height: '100%' }}>
            <main className={styles.resourceListing_main_section}>
              <div className={styles.resourceListing_header}>
                <div className="col-lg-6">
                  <div className={styles.resourceListing_header_left}>
                    <h1
                      className={styles.resourceListing_main_section_title}
                      style={isLight ? { color: '#040F1F' } : undefined}
                    >
                      Resources
                    </h1>
                  </div>
                </div>
                <div className="col-lg-6 search-flex">
                <div className={styleSheet.search_panel_area}>
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className={styleSheet.search_form}
                  >
                    <span className={styleSheet.search_icon}>
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
                      placeholder="Search resources"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className={styleSheet.search_panel}
                      suppressHydrationWarning
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className={styleSheet.clear_search_button}
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4 cursor-pointer mt-[-3px]" />
                      </button>
                    )}
                    {/* Sort toggle (resources have no filters, only sorting) */}
                    <span
                      className={styleSheet.search_panel_filter_icon}
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height={20}
                        width={20}
                        viewBox="0 0 640 640"
                        style={{
                          transform: 'rotate(180deg)',
                          fill: isLight ? '#000' : '#fff',
                        }}
                      >
                        <path d="M352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160L384 160C401.7 160 416 145.7 416 128C416 110.3 401.7 96 384 96L352 96zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288L448 288C465.7 288 480 273.7 480 256C480 238.3 465.7 224 448 224L352 224zM352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416L512 416C529.7 416 544 401.7 544 384C544 366.3 529.7 352 512 352L352 352zM352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544L576 544C593.7 544 608 529.7 608 512C608 494.3 593.7 480 576 480L352 480zM182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4z" />
                      </svg>
                    </span>
                  </form>
                </div>
                </div>
              </div>

              {/* Sort section (toggled from the search-bar sort icon) */}
              <div
                className={`${styles.sort_section} ${
                  isFilterOpen
                    ? styles.sort_section_open
                    : styles.sort_section_closed
                }`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <SortByPills
                    groups={DEFAULT_SORT_GROUPS}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </div>
              </div>

              {/* Resource cards */}
              <div className={styles.list} ref={setScrollContainer}>
                {isLoading ? (
                  <ResourceCardSkeleton count={6} />
                ) : allResources.length === 0 ? (
                  <div className={styles.empty}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isLight ? '#888' : '#a0aec0'}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.7 }}
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <p className={styles.empty_title}>
                      No resources match your search.
                    </p>
                    <p className={styles.empty_sub}>
                      Try adjusting your search or category.
                    </p>
                  </div>
                ) : (
                  <div className={styles.r_grid}>
                    {allResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        id={resource.id}
                        title={resource.title}
                        excerpt={resource.excerpt}
                        thumbnail_url={resource.thumbnail_url}
                        media_count={resource.media_count}
                        is_featured={resource.is_featured}
                        published_at={resource.published_at}
                        created_at={resource.created_at}
                        category={resource.category}
                        onBeforeNavigate={saveBeforeNavigate}
                      />
                    ))}
                  </div>
                )}

                {/* Infinite Scroll Sentinel */}
                {hasNextPage && (
                  <div ref={observerTarget} className="text-center py-6">
                    {isFetchingNextPage && (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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

export default ResourceListing
