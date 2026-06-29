'use client'

import styles from '@/moduleCss/connection.module.css'
import UserDefaultImg from '../../../public/profile/default_user_icon.png'
import { MapPin, X } from 'lucide-react'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import { GlobalSpinner } from '../commonUI/loaders/spinners/GlobalSpinner'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useListingPreserve } from '@/app/hooks/useListingPreserve'
import { useListingState } from '@/app/hooks/useListingState'
import { ChevronDown, ChevronUp } from 'lucide-react'
import jobstyles from '@/moduleCss/jobs.module.css'
import {
  getUserConnections,
  receiveConnectionRequests,
  sentConnectionRequests,
  declinedConnectionRequests,
  updateConnectionStatus,
  deleteConnections,
  sendConnection
} from '@/services/connections.services'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import styleSheet from '@/_assets/style/style.module.css'
import { toast } from 'react-toastify'
import LogOutModal from '../commonUI/LogOutModal'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ensureValidToken } from '@/lib/tokenManager'
import Avatar from '../commonUI/Avatar'
import ConnectionCardSkeleton from '../commonUI/loaders/skeletons/ConnectionCard'
import ProfileCardsmall from '../commonUI/ProfileCardsmall'
import ProfileCardSmallSkeleton from '../commonUI/loaders/skeletons/ProfileCardSmallSkeleton'
import ConnectionPageSkeleton from '../commonUI/loaders/skeletons/ConnectionPageSkeleton'
import { useTheme } from '@/context/ThemeContext'
import Image from 'next/image'
import PeopleIcon from '@/_assets/icons/header_icons/famicons_people.svg'
type TabType = 'connections' | 'received' | 'sent' | 'declined'

type ConnectionAction = 'withdraw' | 'decline' | 'remove'

interface ConnectionItem {
  id: string
  full_name: string
  email: string
  profile_image_url?: string
  connected: string | null
  connection_role: 'sender' | 'receiver' | null
  connect_id: string
  user?: any
  user_id?: string
  location?: string
  first_name?: string
  last_name?: string
}

const ConnectionList = () => {
  const router = useRouter()

  const { saveBeforeNavigate, setScrollContainer } = useListingPreserve('connection-list')

  const toTitleCase = (name?: string) => {
    if (!name) return ''
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawConnectionId, setWithdrawConnectionId] = useState<
    string | null
  >(null)

  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [declineConnectionId, setDeclineConnectionId] = useState<string | null>(
    null
  )

  const [popUpTextTitle, setPopUpTextTitle] = useState('')
  const [popUpText, setPopUpText] = useState('')

  //=====================================================

  const [confirmAction, setConfirmAction] = useState<{
    type: ConnectionAction
    connectionId: string
  } | null>(null)

  //=====================================================

  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  const [open, setOpen] = useState(true)

  const queryClient = useQueryClient()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Persist UI state across back-navigation from /user/<id>. URL `?tab=`
  // still wins over the persisted blob (deep links, in-app handleTabChange
  // updates the URL).
  const [persisted, setPersisted] = useListingState('connection-list', {
    activeTab: 'connections' as TabType,
    searchText: '',
    page: 1,
  })

  const getInitialTab = (): TabType => {
    const tab = searchParams.get('tab') as TabType
    const valid: TabType[] = ['connections', 'received', 'sent', 'declined']
    if (valid.includes(tab)) return tab
    return persisted.activeTab
  }

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab)
  const [searchText, setSearchText] = useState(persisted.searchText)
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.searchText)
  const [page, setPage] = useState(persisted.page)
  const limit = 10

  // ---- Debounce: wait 400ms after user stops typing ----
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText)
      setPage(1) // reset to first page on every new search
    }, 400)
    return () => clearTimeout(timer)
  }, [searchText])

  // Mirror UI state into the persisted blob for back-nav restore.
  useEffect(() => {
    setPersisted({ activeTab, searchText, page })
  }, [activeTab, searchText, page, setPersisted])

  /* ============ USER PROFILE ============ */
  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile()
  const user = userProfile?.data

  // When any tab has search text, show global user search results
  const isServerSideSearch = debouncedSearch.trim().length > 0

  /* ============ QUERIES ============ */

  // My Connections tab (only active when not in search mode)
  const acceptedQuery = useQuery({
    queryKey: ['connections', 'accepted', page],
    queryFn: async () => {
      await ensureValidToken()
      return getUserConnections({ page, limit, connection_status: 'accepted' })
    },
    enabled: activeTab === 'connections' && !isServerSideSearch,
    staleTime: 30_000,
    refetchOnMount: true
  })

  // ACTUAL connections count (always without search)
  const actualConnectionsCountQuery = useQuery({
    queryKey: ['connections', 'accepted', 'actual-count'],
    queryFn: async () => {
      await ensureValidToken()
      return getUserConnections({
        page: 1,
        limit: 1,
        connection_status: 'accepted'
      })
    },
    staleTime: 30_000,
    refetchOnMount: true
  })

  // Received tab (only active when not in search mode)
  const receivedQuery = useQuery({
    queryKey: ['connections', 'received', page],
    queryFn: async () => {
      await ensureValidToken()
      return receiveConnectionRequests({ page, limit })
    },
    enabled: activeTab === 'received' && !isServerSideSearch,
    staleTime: 30_000,
    refetchOnMount: true
  })

  // Sent tab (only active when not in search mode)
  const sentQuery = useQuery({
    queryKey: ['connections', 'sent', page],
    queryFn: async () => {
      await ensureValidToken()
      return sentConnectionRequests({ page, limit })
    },
    enabled: activeTab === 'sent' && !isServerSideSearch,
    staleTime: 30_000,
    refetchOnMount: true
  })

  // Declined tab (only active when not in search mode)
  const declinedQuery = useQuery({
    queryKey: ['connections', 'declined', page],
    queryFn: async () => {
      await ensureValidToken()
      return declinedConnectionRequests({ page, limit })
    },
    enabled: activeTab === 'declined' && !isServerSideSearch,
    staleTime: 30_000,
    refetchOnMount: true
  })

  // Global search query — used for ALL tabs when search text is present
  const globalSearchQuery = useQuery({
    queryKey: ['connections', 'search', page, debouncedSearch],
    queryFn: async () => {
      await ensureValidToken()
      return getUserConnections({ page, limit, search_text: debouncedSearch.trim() })
    },
    enabled: isServerSideSearch,
    staleTime: 30_000,
    refetchOnMount: true
  })

  const queryMap = {
    connections: acceptedQuery,
    received: receivedQuery,
    sent: sentQuery,
    declined: declinedQuery
  }

  const activeQuery = isServerSideSearch ? globalSearchQuery : queryMap[activeTab]

  // Sidebar badge counts (no search)
  const receivedCountQuery = useQuery({
    queryKey: ['connections', 'received', 'count'],
    queryFn: async () => {
      await ensureValidToken()
      return receiveConnectionRequests({ page: 1, limit: 1 })
    },
    staleTime: 0
  })

  const sentCountQuery = useQuery({
    queryKey: ['connections', 'sent', 'count'],
    queryFn: async () => {
      await ensureValidToken()
      return sentConnectionRequests({ page: 1, limit: 1 })
    },
    staleTime: 0
  })

  const declinedCountQuery = useQuery({
    queryKey: ['connections', 'declined', 'count'],
    queryFn: async () => {
      await ensureValidToken()
      return declinedConnectionRequests({ page: 1, limit: 1 })
    },
    staleTime: 0
  })

  /* ============ MUTATIONS ============ */

  const sendConnectionMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      await ensureValidToken()
      return sendConnection({ receiver_id: connectionId })
    },
    onMutate: async ({ connectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })

      const previousData = queryClient.getQueryData([
        'connections', 'search', page, debouncedSearch
      ])

      if (isServerSideSearch) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          (old: any) => {
            if (!old?.data?.data?.result) return old
            return {
              ...old,
              data: {
                ...old.data,
                data: {
                  ...old.data.data,
                  result: old.data.data.result.map((item: ConnectionItem) =>
                    item.id === connectionId
                      ? {
                          ...item,
                          connected: 'pending',
                          connection_role: 'sender',
                          connect_id: 'temp-' + connectionId
                        }
                      : item
                  )
                }
              }
            }
          }
        )
      }

      return { previousData }
    },
    onError: (error, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          context.previousData
        )
      }
      if (isUnauthenticatedError(error)) openGate('send a connection request')
      console.error('Failed to send connection:', error)
    },
    onSuccess: () => {
      toast.success('Connection request sent successfully')
      queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
    }
  })

  const withdrawConnectionMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: connectionId, status: '4' })
    },
    onMutate: async ({ connectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })

      const previousAccepted = queryClient.getQueryData([
        'connections', 'search', page, debouncedSearch
      ])
      const previousSent = queryClient.getQueryData([
        'connections', 'sent', page
      ])

      if (isServerSideSearch) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          (old: any) => {
            if (!old?.data?.data?.result) return old
            return {
              ...old,
              data: {
                ...old.data,
                data: {
                  ...old.data.data,
                  result: old.data.data.result.map((item: ConnectionItem) =>
                    item.connect_id === connectionId
                      ? { ...item, connected: null, connection_role: null }
                      : item
                  )
                }
              }
            }
          }
        )
      }

      return { previousAccepted, previousSent }
    },
    onError: (error, variables, context: any) => {
      if (context?.previousAccepted) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          context.previousAccepted
        )
      }
      if (context?.previousSent) {
        queryClient.setQueryData(
          ['connections', 'sent', page],
          context.previousSent
        )
      }
      if (isUnauthenticatedError(error)) openGate('remove this connection')
      console.error('Failed to withdraw connection:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
    }
  })

  const acceptConnectionMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: connectionId, status: '1' })
    },
    onMutate: async ({ connectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })

      const previousReceived = queryClient.getQueryData([
        'connections', 'received', page
      ])
      const previousAccepted = queryClient.getQueryData([
        'connections', 'search', page, debouncedSearch
      ])

      return { previousReceived, previousAccepted }
    },
    onError: (error, variables, context: any) => {
      if (context?.previousReceived) {
        queryClient.setQueryData(
          ['connections', 'received', page],
          context.previousReceived
        )
      }
      if (context?.previousAccepted) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          context.previousAccepted
        )
      }
      if (isUnauthenticatedError(error)) openGate('accept this request')
      console.error('Failed to accept connection:', error)
    },
    onSuccess: () => {
      toast.success('Connection accepted successfully')
      queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
    }
  })

  const declineConnectionMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: connectionId, status: '2' })
    },
    onMutate: async ({ connectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })

      const previousReceived = queryClient.getQueryData([
        'connections', 'received', page
      ])
      const previousAccepted = queryClient.getQueryData([
        'connections', 'search', page, debouncedSearch
      ])

      return { previousReceived, previousAccepted }
    },
    onError: (error, variables, context: any) => {
      if (context?.previousReceived) {
        queryClient.setQueryData(
          ['connections', 'received', page],
          context.previousReceived
        )
      }
      if (context?.previousAccepted) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          context.previousAccepted
        )
      }
      if (isUnauthenticatedError(error)) openGate('decline this request')
      console.error('Failed to decline connection:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
    }
  })

  const deleteConnectionMutation = useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      await ensureValidToken()
      return deleteConnections({ connection_id: connectionId, status: '5' })
    },
    onMutate: async ({ connectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })
      const previousData = queryClient.getQueryData([
        'connections', 'search', page, debouncedSearch
      ])
      return { previousData }
    },
    onError: (error, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['connections', 'search', page, debouncedSearch],
          context.previousData
        )
      }
      if (isUnauthenticatedError(error)) openGate('remove this connection')
      console.error('Failed to delete connection:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
    }
  })

  /* ============ DATA EXTRACTION ============ */

  const totalCount_accepted =
    actualConnectionsCountQuery?.data?.data?.data?.total_count || 0
  const totalCount_sent = sentCountQuery?.data?.data?.data?.total_count || 0
  const totalCount_declined =
    declinedCountQuery?.data?.data?.data?.total_count || 0
  const totalCount_received =
    receivedCountQuery?.data?.data?.data?.total_count || 0

  // Track whether user has seen the received tab — dot hides once they visit it
  const RECEIVED_SEEN_KEY = 'receivedConnectionsSeenCount'
  const getReceivedSeenCount = () => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem(RECEIVED_SEEN_KEY) ?? '0', 10)
  }
  const [receivedSeenCount, setReceivedSeenCount] = useState<number>(getReceivedSeenCount)
  useEffect(() => {
    if (activeTab === 'received' && totalCount_received > 0) {
      localStorage.setItem(RECEIVED_SEEN_KEY, String(totalCount_received))
      setReceivedSeenCount(totalCount_received)
    }
  }, [activeTab, totalCount_received])
  const showReceivedDot = totalCount_received > receivedSeenCount

  /**
   * Flexibly extract the `result` array from the query response.
   * The services do `return res.data` (Axios response.data),
   * then React Query wraps it in `.data`, so the shape can be:
   *   queryData.data.data.result   (most common)
   *   queryData.data.result        (if backend returns {data: {result}})
   *   queryData.result             (unlikely but safe fallback)
   */
  const extractResults = (queryData: any): ConnectionItem[] => {
    if (queryData?.data?.data?.result) return queryData.data.data.result
    if (queryData?.data?.result) return queryData.data.result
    if (queryData?.result) return queryData.result
    return []
  }

  const connections_new = extractResults(activeQuery?.data)
  const connectionsLoading_new = activeQuery?.isLoading

  /* ---------------- SCROLL RESTORATION ---------------- */
  // Wraps any active connection-detail navigation so back-nav can restore scroll.
  // Future detail-nav sites (currently commented out per REQUIREMENTS.md) should
  // call this helper instead of router.push directly.
  const navigateToConnection = useCallback(
    (userId: string) => {
      saveBeforeNavigate()
      router.push(`/user/${userId}`)
    },
    [router, saveBeforeNavigate]
  )

  /* ============ HANDLERS ============ */

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setPage(1)
    setSearchText('')
    setDebouncedSearch('')

    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'connections') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })

    queryClient.invalidateQueries({
      queryKey: ['connections', tab === 'connections' ? 'accepted' : tab]
    })
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'received':
        return 'Received'
      case 'sent':
        return 'Sent Requests'
      case 'declined':
        return 'Declined Requests'
      default:
        return 'Connections'
    }
  }

  const ACTION_CONFIG: Record<
    ConnectionAction,
    {
      title: string
      message: string
      successToast: string
      handler: (connectionId: string) => void
    }
  > = {
    withdraw: {
      title: 'Withdraw Connection Request?',
      message: 'Are you sure you want to withdraw this connection request?',
      successToast: 'Connection withdrawn successfully',
      handler: connectionId => {
        withdrawConnectionMutation.mutate(
          { connectionId },
          { onSuccess: () => toast.success('Connection withdrawn successfully') }
        )
      }
    },
    decline: {
      title: 'Decline Connection Request?',
      message: 'Are you sure you want to decline this connection request?',
      successToast: 'Connection declined successfully',
      handler: connectionId => {
        declineConnectionMutation.mutate(
          { connectionId },
          { onSuccess: () => toast.success('Connection declined successfully') }
        )
      }
    },
    remove: {
      title: 'Remove Connection?',
      message: 'Are you sure you want to remove this connection?',
      successToast: 'Connection removed successfully',
      handler: connectionId => {
        deleteConnectionMutation.mutate(
          { connectionId },
          { onSuccess: () => toast.success('Connection removed successfully') }
        )
      }
    }
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    const { type, connectionId } = confirmAction
    setActiveActionId(connectionId)
    ACTION_CONFIG[type].handler(connectionId)
    setConfirmAction(null)
  }

  const getEmptyMessage = (tab: string) => {
    if (searchText.trim()) return 'No results found'
    switch (tab) {
      case 'connections': return 'No connections yet'
      case 'received': return 'No received requests'
      case 'sent': return 'No sent requests'
      case 'declined': return 'No declined requests'
      default: return `No ${tab} found`
    }
  }

  const clearSearch = () => {
    setSearchText('')
    setDebouncedSearch('')
    setPage(1)

    const tabKey = activeTab === 'connections' ? 'accepted' : activeTab
    queryClient.invalidateQueries({
      queryKey: ['connections', tabKey],
      exact: false
    })
  }

  const getProfileUserId = (item: ConnectionItem) => {
    if (activeTab === 'connections') return item.id
    return item.user?.id || item.user_id || item.id
  }

  /* ============ EARLY RETURNS ============ */

  if (userProfileLoading) {
    return (
      <div>
        <ConnectionPageSkeleton />
      </div>
    )
  }

  return (
    <div
      className={`container mx-auto px-4 ${styles.connectionlisting_main_section_wrapper}`}
    >
      <div
        className='flex mt-6 max-content-height flex-wrap -mx-2'
        style={{ height: '100%' }}
      >
        {/* ============ SIDEBAR ============ */}
        <div className='col-lg-4 full-width-midium' style={{ height: '100%' }}>
          <aside className={styles.sidebar_main_section}>
            <ProfileCardsmall />

            <div className={styles.side_connection_navigation}>
              <div
                className={styles.side_connection_info}
                onClick={() => handleTabChange('connections')}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <h1
                    className={styles.side_connection_navigation_title}
                    style={isLight ? { color: '#040F1F' } : undefined}
                  >
                    My Connections
                  </h1>
                </div>
                <div>
                  <h1 className={styles.side_connection_navigation_title}>
                    {totalCount_accepted}
                  </h1>
                </div>
              </div>

              <div
                className={styles.connectionRow}
                onClick={() => setOpen(!open)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.connectionmain_label}>
                  <span style={isLight ? { color: '#040F1F' } : undefined}>
                    Requests
                  </span>
                </div>
                <div>
                  <span className={styles.arrow}>
                    {open ? (
                      <ChevronUp height={15} width={15} />
                    ) : (
                      <ChevronDown height={15} width={15} />
                    )}
                  </span>
                </div>
              </div>

              {open && (
                <div className={styles.connectionDropdown}>
                  <div
                    className={
                      activeTab === 'received'
                        ? styles.connectionItemActive
                        : styles.connectionItem
                    }
                    onClick={() => handleTabChange('received')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.connectionlabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={isLight ? { color: activeTab === 'received' ? '#040F1F' : '#888' } : undefined}>Received</span>
                      {showReceivedDot && (
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#20BDFF',
                          display: 'inline-block',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <div>
                      <span
                        style={
                          isLight
                            ? {
                                color:
                                  activeTab === 'received' ? '#040F1F' : '#888'
                              }
                            : undefined
                        }
                      >
                        ({totalCount_received})
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      activeTab === 'sent'
                        ? styles.connectionItemActive
                        : styles.connectionItem
                    }
                    onClick={() => handleTabChange('sent')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.connectionlabel}>
                      <span
                        style={
                          isLight
                            ? {
                                color: activeTab === 'sent' ? '#040F1F' : '#888'
                              }
                            : undefined
                        }
                      >
                        Sent
                      </span>
                    </div>
                    <div>
                      <span
                        style={
                          isLight
                            ? {
                                color: activeTab === 'sent' ? '#040F1F' : '#888'
                              }
                            : undefined
                        }
                      >
                        ({totalCount_sent})
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      activeTab === 'declined'
                        ? styles.connectionItemActive
                        : styles.connectionItem
                    }
                    onClick={() => handleTabChange('declined')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.connectionlabel}>
                      <span
                        style={
                          isLight
                            ? {
                                color:
                                  activeTab === 'declined' ? '#040F1F' : '#888'
                              }
                            : undefined
                        }
                      >
                        Declined
                      </span>
                    </div>
                    <div>
                      <span
                        style={
                          isLight
                            ? {
                                color:
                                  activeTab === 'declined' ? '#040F1F' : '#888'
                              }
                            : undefined
                        }
                      >
                        ({totalCount_declined})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ============ MAIN CONTENT ============ */}
        <div className='col-lg-8 full-width-midium' style={{ height: '100%' }}>
          <main className={styles.connectionlisting_main_section}>
            <div className={styles.connectionlisting_main_section_header}>
              <div className='col-lg-6'>
                <h1
                  className={styles.connectionlisting_main_section_title}
                  style={isLight ? { color: '#040F1F' } : undefined}
                >
                  {getTabTitle()}
                </h1>
              </div>
              <div className='col-lg-6 search-flex'>
                <div className={styleSheet.search_panel_area}>
                  <form className={styleSheet.search_form}>
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

                    <div className='relative w-full'>
                      <input
                        type='text'
                        placeholder={
                          activeTab === 'connections'
                            ? 'Search'
                            : 'Search'
                        }
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className={`${styleSheet.search_panel} pr-10`}
                      />

                      {searchText && (
                        <button
                          type='button'
                          onClick={clearSearch}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer'
                          aria-label='Clear search'
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className={styles.connectionlisting_connection_list_container} ref={setScrollContainer}>
              <div className={styles.connectionlisting_connection_list}>
                {connectionsLoading_new ? (
                  <div className='overflow-hidden relative space-y-2'>
                    <div className='full-width-midium relative overflow-hidden'>
                      <ConnectionCardSkeleton />
                    </div>
                    <div className='full-width-midium relative overflow-hidden'>
                      <ConnectionCardSkeleton />
                    </div>
                  </div>
                ) : connections_new.length === 0 ? (
                  <div className='text-center' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '20px 0' }}>
                    <Image
                      src={PeopleIcon}
                      alt='No connections'
                      width={24}
                      height={24}
                      style={{ opacity: 0.5, ...(isLight ? { filter: 'brightness(0) saturate(100%) invert(3%) sepia(15%) saturate(4962%) hue-rotate(186deg) brightness(97%) contrast(101%)' } : {}) }}
                    />
                    <p style={{ color: isLight ? '#040F1F' : 'rgb(144 161 185)', margin: 0 }}>
                      {getEmptyMessage(activeTab)}
                    </p>
                  </div>
                ) : (
                  connections_new.map((item: ConnectionItem) => (
                    <div
                      key={item.id}
                      className={`${styles.connectionlisting_connection_item} card-hover`}
                      onClick={e => {
                        e.stopPropagation()
                        const userId = getProfileUserId(item)
                        if (!userId) {
                          console.warn('User ID not found for item:', item)
                          return
                        }
                        // TODO: when connection detail navigation is fully released, this is the disabled detail-nav site — saveScroll('yp:scroll:connections', { tab: activeTab }) is already wrapped via navigateToConnection below.
                        navigateToConnection(userId)
                      }}
                    >
                      <div
                        className={styles.connectionlisting_connection_item_main}
                      >
                        <div
                          className={styles.connectionlisting_connection_item_logo}
                        >
                          <Avatar
                            imageUrl={
                              item.profile_image_url ||
                              item.user?.profile_image_url ||
                              null
                            }
                            firstName={item?.first_name || item?.user?.first_name}
                            lastName={item?.last_name || item?.user?.last_name}
                            className={`w-full h-full object-cover ${styles.connection_avatar} cursor-pointer`}
                          />
                        </div>

                        <div
                          className={styles.connectionlisting_connection_item_content}
                        >
                          <h4
                            className={styles.connectionlisting_connection_item_name}
                            style={isLight ? { color: '#040F1F' } : undefined}
                          >
                            {toTitleCase(item.full_name || item.user?.full_name)}
                          </h4>
                          <p
                            className={styles.connectionlisting_connection_item_details}
                          >
                          </p>
                          {isLight ? (
                            <p className={jobstyles.light_side_profile_location}>
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
                              {item.user?.location || item?.location || 'N/A'}
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
                              {item.user?.location || item?.location || 'N/A'}
                            </p>
                          )}
                        </div>

                        <div
                          className={styles.connectionlisting_connection_item_btns}
                        >
                          {/* ================= SERVER-SIDE SEARCH MODE (Connections Tab + has search text) ================= */}
                          {isServerSideSearch && (
                            <>
                              {item.connected === null &&
                                item.connection_role === null && (
                                  <button
                                    className={isLight ?
                                      "light-apply-btn"
                                      : styles.connectionlisting_apply_button}
                                    onClick={e => {
                                      e.stopPropagation()
                                      ensureAuthed('send a connection request', () => {
                                        setActiveActionId(item.id)
                                        sendConnectionMutation.mutate(
                                          { connectionId: item.id },
                                          { onSettled: () => setActiveActionId(null) }
                                        )
                                      })
                                    }}
                                    disabled={
                                      sendConnectionMutation.isPending &&
                                      activeActionId === item.id
                                    }
                                  >
                                    {sendConnectionMutation.isPending &&
                                    activeActionId === item.id
                                      ? 'Connecting...'
                                      : 'Connect'}
                                  </button>
                                )}

                              {item.connected === 'pending' &&
                                item.connection_role === 'sender' && (
                                  <button
                                    className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                    onClick={e => {
                                      e.stopPropagation()
                                      ensureAuthed('remove this connection', () => {
                                        setConfirmAction({ type: 'withdraw', connectionId: item.id })
                                      })
                                    }}
                                    disabled={
                                      withdrawConnectionMutation.isPending &&
                                      activeActionId === item.id
                                    }
                                  >
                                    {withdrawConnectionMutation.isPending &&
                                    activeActionId === item.id
                                      ? 'Withdrawing...'
                                      : 'Withdraw'}
                                  </button>
                                )}

                              {item.connected === 'pending' &&
                                item.connection_role === 'receiver' && (
                                  <>
                                    <button
                                      className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                      onClick={e => {
                                        e.stopPropagation()
                                        ensureAuthed('accept this request', () => {
                                          setActiveActionId(item.id)
                                          acceptConnectionMutation.mutate(
                                            { connectionId: item.id },
                                            { onSettled: () => setActiveActionId(null) }
                                          )
                                        })
                                      }}
                                      disabled={
                                        acceptConnectionMutation.isPending &&
                                        activeActionId === item.id
                                      }
                                    >
                                      {acceptConnectionMutation.isPending &&
                                      activeActionId === item.id
                                        ? 'Accepting...'
                                        : 'Accept'}
                                    </button>
                                    <button
                                      className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                      onClick={e => {
                                        e.stopPropagation()
                                        ensureAuthed('decline this request', () => {
                                          setConfirmAction({ type: 'decline', connectionId: item.id })
                                        })
                                      }}
                                      disabled={
                                        declineConnectionMutation.isPending &&
                                        activeActionId === item.id
                                      }
                                    >
                                      {declineConnectionMutation.isPending &&
                                      activeActionId === item.id
                                        ? 'Declining...'
                                        : 'Decline'}
                                    </button>
                                  </>
                                )}

                              {item.connected !== null &&
                                item.connected !== 'pending' && (
                                  <button
                                    className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                    onClick={e => {
                                      e.stopPropagation()
                                      const userId = getProfileUserId(item)
                                      if (!userId) return
                                      router.push(`/messages?user=${userId}`)
                                    }}
                                  >
                                    Message
                                  </button>
                                )}
                            </>
                          )}

                          {/* ================= NORMAL TAB MODE ================= */}
                          {!isServerSideSearch && (
                            <>
                              {activeTab === 'received' && (
                                <>
                                  <button
                                    className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                    onClick={e => {
                                      e.stopPropagation()
                                      ensureAuthed('accept this request', () => {
                                        setActiveActionId(item.id)
                                        acceptConnectionMutation.mutate(
                                          { connectionId: item.user.id },
                                          { onSettled: () => setActiveActionId(null) }
                                        )
                                      })
                                    }}
                                    disabled={
                                      acceptConnectionMutation.isPending &&
                                      activeActionId === item.id
                                    }
                                  >
                                    {acceptConnectionMutation.isPending &&
                                    activeActionId === item.id
                                      ? 'Accepting...'
                                      : 'Accept'}
                                  </button>
                                  <button
                                    className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                    onClick={e => {
                                      e.stopPropagation()
                                      ensureAuthed('decline this request', () => {
                                        setConfirmAction({ type: 'decline', connectionId: item.user.id })
                                      })
                                    }}
                                    disabled={
                                      declineConnectionMutation.isPending &&
                                      activeActionId === item.id
                                    }
                                  >
                                    {declineConnectionMutation.isPending &&
                                    activeActionId === item.id
                                      ? 'Declining...'
                                      : 'Decline'}
                                  </button>
                                </>
                              )}

                              {activeTab === 'sent' && (
                                <button
                                  className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                  onClick={e => {
                                    e.stopPropagation()
                                    ensureAuthed('remove this connection', () => {
                                      setConfirmAction({ type: 'withdraw', connectionId: item.user.id })
                                    })
                                  }}
                                  disabled={
                                    (confirmAction?.type === 'withdraw' &&
                                      confirmAction.connectionId === item.id) ||
                                    (withdrawConnectionMutation.isPending &&
                                      activeActionId === item.id)
                                  }
                                >
                                  {withdrawConnectionMutation.isPending &&
                                  activeActionId === item.id
                                    ? 'Withdrawing...'
                                    : 'Withdraw'}
                                </button>
                              )}

                              {activeTab === 'connections' && (
                                <button
                                  className={isLight ? 'light-apply-btn' : styles.connectionlisting_apply_button}
                                  onClick={e => {
                                    e.stopPropagation()
                                    const userId = getProfileUserId(item)
                                    if (!userId) return
                                    router.push(`/messages?user=${userId}`)
                                  }}
                                >
                                  Message
                                </button>
                              )}

                              {activeTab === 'declined' && null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <LogOutModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? ACTION_CONFIG[confirmAction.type].title : ''}
        onConfirm={handleConfirmAction}
        confirmText='Yes'
        cancelText='No'
      >
        {confirmAction ? ACTION_CONFIG[confirmAction.type].message : ''}
      </LogOutModal>

      {authGateModal}
    </div>
  )
}

export default ConnectionList