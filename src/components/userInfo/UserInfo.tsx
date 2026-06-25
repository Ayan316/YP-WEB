// app/profile/[userId]/page.tsx
'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import ProfileSkeleton from '@/components/commonUI/loaders/skeletons/ProfileSkeleton'
import User from '../../../public/profile/userProfile_image.png'
import { useUserProfile } from '@/app/hooks/useUserProfile'
import { getConnectionUserProfile } from '@/services/profile.services'
import Image from 'next/image'
import styles from '@/moduleCss/profile.module.css'
import QRCode from 'react-qr-code'
import DummyUniversity from '../../../public/images/DummyUniversity.jpg'
import { formateDOBDate } from '@/helpers/dateFormatter'
import formatPhoneForDisplay from '@/helpers/phoneHelpers'
import jobstyles from '@/moduleCss/jobs.module.css'
import {
  MapPin,
  MailIcon,
  Phone,
  Calendar,
  UserPlus,
  UserMinus,
  MessageSquare,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react'
import {
  sendConnection,
  updateConnectionStatus,
  deleteConnections
} from '@/services/connections.services'
import { ensureValidToken } from '@/lib/tokenManager'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { toast } from 'react-toastify'
import LogOutModal from '@/components/commonUI/LogOutModal'
import { useState, useEffect, useRef } from 'react'
import styles2 from '@/moduleCss/connection.module.css'
import Avatar from '../commonUI/Avatar'
import ProfileImagePreview from '../commonUI/ProfileImagePreview'
import ConfirmModal from '../commonUI/ConfirmModal'
import { useTheme } from '@/context/ThemeContext'
import ReportDialog from '../moderation/ReportDialog'
import { blockUser } from '@/services/moderation.services'
import { isUnauthenticatedError } from '@/lib/authError'
import Tooltip from '../commonUI/ToolTip'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionAction = 'withdraw' | 'decline' | 'remove'

interface ConfirmAction {
  type: ConnectionAction
  userId: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserProfilePage () {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()
  const rawUserId = params.userId as string
  const userId = decodeURIComponent(rawUserId)

  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (profileMenuOpen && !target.closest('[data-profile-menu]')) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])

  // ── Current logged-in user ──────────────────────────────────────────────────
  const { data: currentUserProfile } = useUserProfile()
  const currentUser = currentUserProfile?.data
  const isOwnProfile = currentUser?.id === userId

  // ── Target user data ────────────────────────────────────────────────────────
  const {
    data: userData,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getConnectionUserProfile(userId),
    enabled: !!userId && !isOwnProfile,
    staleTime: 1000 * 60 * 5
  })

  // ─── Mutations ─────────────────────────────────────────────────────────────

  /** Optimistically updates the user-profile cache for a given field */
  const patchProfileCache = (
    patch: Partial<{
      connected: string | null
      connection_role: string | null
      connect_id: string | null
    }>
  ) => {
    queryClient.setQueryData(['user-profile', userId], (old: any) => {
      if (!old) return old
      const user = old.data || old
      return {
        ...old,
        data: { ...user, ...patch }
      }
    })
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
    queryClient.invalidateQueries({ queryKey: ['connections'], exact: false })
  }

  // Send connection request
  const sendConnectionMutation = useMutation({
    mutationFn: async () => {
      await ensureValidToken()
      return sendConnection({ receiver_id: userId })
    },
    onMutate: () => {
      setActiveActionId('send')
      patchProfileCache({ connected: 'pending', connection_role: 'sender' })
    },
    onError: (error) => {
      patchProfileCache({ connected: null, connection_role: null })
      if (isUnauthenticatedError(error)) openGate('send a connection request')
      else toast.error('Failed to send connection request')
    },
    onSuccess: () => {
      toast.success('Connection request sent successfully')
      invalidateAll()
    },
    onSettled: () => setActiveActionId(null)
  })

  // Withdraw connection request
  const withdrawConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: userId, status: '4' })
    },
    onMutate: () => setActiveActionId('withdraw'),
    onError: (error) => {
      if (isUnauthenticatedError(error)) openGate('remove this connection')
      else toast.error('Failed to withdraw connection request')
    },
    onSuccess: () => {
      toast.success('Connection withdrawn successfully')
      invalidateAll()
    },
    onSettled: () => setActiveActionId(null)
  })

  // Accept connection request
  const acceptConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: userId, status: '1' })
    },
    onMutate: () => setActiveActionId('accept'),
    onError: (error) => {
      if (isUnauthenticatedError(error)) openGate('accept this request')
      else toast.error('Failed to accept connection')
    },
    onSuccess: () => {
      toast.success('Connection accepted successfully')
      invalidateAll()
    },
    onSettled: () => setActiveActionId(null)
  })

  // Decline connection request
  const declineConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await ensureValidToken()
      return updateConnectionStatus({ connection_id: userId, status: '2' })
    },
    onMutate: () => setActiveActionId('decline'),
    onError: (error) => {
      if (isUnauthenticatedError(error)) openGate('decline this request')
      else toast.error('Failed to decline connection')
    },
    onSuccess: () => {
      toast.success('Connection declined')
      invalidateAll()
    },
    onSettled: () => setActiveActionId(null)
  })

  // Remove / delete connection
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await ensureValidToken()
      return deleteConnections({ connection_id: userId, status: '5' })
    },
    onMutate: () => setActiveActionId('remove'),
    onError: (error) => {
      if (isUnauthenticatedError(error)) openGate('remove this connection')
      else toast.error('Failed to remove connection')
    },
    onSuccess: () => {
      toast.success('Connection removed')
      invalidateAll()
    },
    onSettled: () => setActiveActionId(null)
  })

  // Auto-accept via email link: if the URL carries an accepted_id equal to the
  // logged-in user's id, fire the accept-connection API exactly once.
  const autoAcceptedRef = useRef(false)
  useEffect(() => {
    const acceptedId = searchParams?.get('accept_id')
    if (!acceptedId || autoAcceptedRef.current) return
    if (!currentUser?.id || !userId) return
    if (acceptedId !== currentUser.id) return
    if (acceptConnectionMutation.isPending) return

    const userConnected = (userData as any)?.data?.connected ?? (userData as any)?.connected ?? null
    const userRole = (userData as any)?.data?.connection_role ?? (userData as any)?.connection_role ?? null
    if (userConnected === '1' || userConnected === 'accepted') {
      autoAcceptedRef.current = true
      return
    }
    if (userConnected !== 'pending' || userRole !== 'receiver') return

    autoAcceptedRef.current = true
    acceptConnectionMutation.mutate(userId)
  }, [searchParams, currentUser?.id, userId, userData, acceptConnectionMutation])

  // ── Modal confirm handler ───────────────────────────────────────────────────
  const ACTION_CONFIG: Record<
    ConnectionAction,
    { title: string; message: string; handler: (id: string) => void }
  > = {
    withdraw: {
      title: 'Withdraw Connection Request?',
      message: 'Are you sure you want to withdraw this connection request?',
      handler: id => withdrawConnectionMutation.mutate(id)
    },
    decline: {
      title: 'Decline Connection Request?',
      message: 'Are you sure you want to decline this connection request?',
      handler: id => declineConnectionMutation.mutate(id)
    },
    remove: {
      title: 'Disconnect Connection?',
      message: 'Are you sure you want to disconnect this connection?',
      handler: id => deleteConnectionMutation.mutate(id)
    }
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    ACTION_CONFIG[confirmAction.type].handler(confirmAction.userId)
    setConfirmAction(null)
  }

  // ── Early returns ───────────────────────────────────────────────────────────
  if (isOwnProfile) {
    router.replace('/connections')
    return null
  }

  if (isLoading) return <ProfileSkeleton />

  if (isError || !userData) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-white mb-4'>User Not Found</h2>
          <p className='text-gray-400 mb-6'>
            The profile you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <button
            onClick={() => router.back()}
            className='px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer'
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const user = userData.data || userData
  const userProfilePic = user?.profile_image_url || null

  const handleBlockConfirm = () =>
    ensureAuthed('block this user', async () => {
    const userName = user?.first_name || user?.full_name || 'this user'
    setBlockLoading(true)
    try {
      await blockUser(userId)
      toast.success(`${userName} has been blocked.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feeds"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["comments"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile", userId] }),
        queryClient.invalidateQueries({ queryKey: ["connections"], exact: false }),
      ])
      setBlockDialogOpen(false)
      router.push("/connections")
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? err?.message ?? ""
      if (isUnauthenticatedError(err)) {
        openGate("block this user")
      } else if (!/cannot block yourself/i.test(msg) && !/User is not blocked/i.test(msg)) {
        toast.error(msg || "Action failed. Please try again.")
      }
      setBlockDialogOpen(false)
    } finally {
      setBlockLoading(false)
    }
    })

  // Connection state derived from user data
  const connected: string | null = user?.connected ?? null
  const connectionRole: 'sender' | 'receiver' | null =
    user?.connection_role ?? null
  const connectId: string | null = user?.connect_id ?? null
  // `is_blocked` is returned by the profile API as true when the viewer has
  // blocked this person; no connection action should be possible in that case.
  const isBlockedByMe: boolean = Boolean(user?.is_blocked)

  console.log('Users from user info', user)

  // ── Action Buttons ──────────────────────────────────────────────────────────
  const isAnyMutationPending =
    sendConnectionMutation.isPending ||
    withdrawConnectionMutation.isPending ||
    acceptConnectionMutation.isPending ||
    declineConnectionMutation.isPending ||
    deleteConnectionMutation.isPending

  const actionButtons = (
    <ConnectionActionButtons
      connected={connected}
      connectionRole={connectionRole}
      connectId={connectId}
      userId={userId}
      activeActionId={activeActionId}
      isAnyMutationPending={isAnyMutationPending}
      isBlockedByMe={isBlockedByMe}
      onSend={() => ensureAuthed('send a connection request', () => sendConnectionMutation.mutate())}
      onWithdraw={() => ensureAuthed('remove this connection', () => setConfirmAction({ type: 'withdraw', userId }))}
      onAccept={() => ensureAuthed('accept this request', () => acceptConnectionMutation.mutate(userId))}
      onDecline={() => ensureAuthed('decline this request', () => setConfirmAction({ type: 'decline', userId }))}
      onRemove={() => ensureAuthed('remove this connection', () => setConfirmAction({ type: 'remove', userId }))}
      onMessage={() => router.push(`/messages?user=${userId}`)}
    />
  )

  // const profileMenuButton = (
  //   <div style={{ position: 'relative' }} data-profile-menu>
  //     <button
  //       onClick={() => setProfileMenuOpen(v => !v)}
  //       style={{
  //         background: 'transparent',
  //         border: 'none',
  //         cursor: 'pointer',
  //         padding: '4px',
  //         borderRadius: '50%',
  //         display: 'flex',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //       }}
  //     >
  //       <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 256 256">
  //         <path fill={isLight ? '#040F1F' : '#a0aec0'} d="M156 128a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-28-52a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0 104a28 28 0 1 0 28 28a28 28 0 0 0-28-28" />
  //       </svg>
  //     </button>
  //     {profileMenuOpen && (
  //       <div
  //         style={{
  //           position: 'absolute',
  //           top: '100%',
  //           right: 0,
  //           zIndex: 50,
  //           background: isLight ? '#fff' : '#0d1b2e',
  //           border: isLight ? '1px solid #E8EEFE' : '1px solid #2d3748',
  //           borderRadius: '8px',
  //           boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.4)',
  //           minWidth: '160px',
  //           overflow: 'hidden',
  //         }}
  //       >
  //         <div
  //           onClick={() => { setProfileMenuOpen(false); setReportDialogOpen(true); }}
  //           style={{
  //             padding: '10px 16px',
  //             cursor: 'pointer',
  //             color: isLight ? '#040F1F' : '#e2e8f0',
  //             fontSize: '14px',
  //             fontWeight: '500',
  //             display: 'flex',
  //             alignItems: 'center',
  //             gap: '8px',
  //             transition: 'background-color 0.15s',
  //           }}
  //           onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? '#F4F6FF' : '#1a2744')}
  //           onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  //         >
  //           <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
  //             <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
  //           </svg>
  //           Report User
  //         </div>
  //         <div style={{ height: '1px', background: isLight ? '#E8EEFE' : '#2d3748', margin: '0 12px' }} />
  //         <div
  //           onClick={() => { setProfileMenuOpen(false); setBlockDialogOpen(true); }}
  //           style={{
  //             padding: '10px 16px',
  //             cursor: 'pointer',
  //             color: '#ef4444',
  //             fontSize: '14px',
  //             fontWeight: '500',
  //             display: 'flex',
  //             alignItems: 'center',
  //             gap: '8px',
  //             transition: 'background-color 0.15s',
  //           }}
  //           onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? '#FEF2F2' : '#1a2744')}
  //           onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  //         >
  //           <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
  //             <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  //           </svg>
  //           Block User
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // )

  return (
    <>
      <ProfileLayout
        title={`${user?.first_name || user?.full_name || 'User'}'s Profile`}
        topLeft={
          <ReadOnlyProfileImageCard
            imageSrc={userProfilePic}
            firstName={user?.first_name}
            lastName={user?.last_name}
            userId={userId}
            location={user?.location || 'N/A'}
            onImageClick={() => setIsImagePreviewOpen(true)}
          />
        }
        topRight={
          <ReadOnlyEducationCard
            university={user?.college || 'N/A'}
            degree={user?.study_field || 'N/A'}
            duration={
              user?.start_year && user?.end_year
                ? `${user.start_year.slice(-4)} - ${user.end_year.slice(-4)}`
                : 'Not Provided'
            }
          />
        }
        bottomLeft={<ReadOnlyAboutCard about={user?.about || ''} />}
        bottomRight={<ReadOnlySkillsCard skills={user?.skills || []} />}
      />

      {/* <LogOutModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? ACTION_CONFIG[confirmAction.type].title : ""}
        onConfirm={handleConfirmAction}
        confirmText="Yes"
        cancelText="No"
      >
        {confirmAction ? ACTION_CONFIG[confirmAction.type].message : ""}
      </LogOutModal> */}

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? ACTION_CONFIG[confirmAction.type].title : ''}
        message={confirmAction ? ACTION_CONFIG[confirmAction.type].message : ''}
        onConfirm={handleConfirmAction}
        confirmText='Yes'
        cancelText='No'
      />

      <ProfileImagePreview
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={userProfilePic}
        firstName={user?.first_name}
        lastName={user?.last_name}
      />

      <ReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        reportedType="user"
        reportedId={userId}
      />

      <ConfirmModal
        isOpen={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onConfirm={handleBlockConfirm}
        title={`Block User`}
        message={`Are you sure you want to block ${user?.full_name || user?.first_name || 'this user'}? You won't see their posts, comments, or messages.`}
        confirmText="Block"
        cancelText="Cancel"
        isLoading={blockLoading}
        loadingText="Blocking…"
      />

      {authGateModal}
    </>
  )
}

// ─── Connection Action Buttons Component ──────────────────────────────────────

interface ConnectionActionButtonsProps {
  connected: string | null
  connectionRole: 'sender' | 'receiver' | null
  connectId: string | null
  userId: string
  activeActionId: string | null
  isAnyMutationPending: boolean
  isBlockedByMe?: boolean
  onSend: () => void
  onWithdraw: (id: string) => void
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onRemove: (id: string) => void
  onMessage: () => void
}

function ConnectionActionButtons ({
  connected,
  connectionRole,
  connectId,
  activeActionId,
  isAnyMutationPending,
  isBlockedByMe = false,
  onSend,
  onWithdraw,
  onAccept,
  onDecline,
  onRemove,
  onMessage
}: ConnectionActionButtonsProps) {
  const btnBase = `${styles2.connectionlisting_apply_button}`
  const btnPrimary = `${btnBase}`
  const btnOutline = `${btnBase}`
  const btnDanger = `${btnBase}`

  const Spinner = () => <Loader2 size={14} className='animate-spin' />

  // ── Blocked by me ─────────────────────────────────────────────────────────
  // When the viewer has blocked this user, disable every connection action
  // and show a tooltip explaining why. This sits before the other branches
  // so it applies regardless of the current connection state.
  if (isBlockedByMe) {
    return (
      <Tooltip
        content='You have blocked this person.'
        position='top'
        width='w-56'
      >
        <button className={btnPrimary} disabled aria-disabled='true'>
          Connect
        </button>
      </Tooltip>
    )
  }

  // ── No connection ──────────────────────────────────────────────────────────
  if (connected === null) {
    return (
      <button
        className={btnPrimary}
        onClick={onSend}
        disabled={isAnyMutationPending}
      >
        {/* {activeActionId === "send" ? <Spinner /> : <UserPlus size={16} />} */}
        {activeActionId === 'send' ? 'Connecting...' : 'Connect'}
      </button>
    )
  }

  // ── Pending — current user is sender ──────────────────────────────────────
  if (connected === 'pending' && connectionRole === 'sender') {
    return (
      <button
        className={btnOutline}
        onClick={() => connectId && onWithdraw(connectId)}
        disabled={isAnyMutationPending}
      >
        {/* {activeActionId === "withdraw" ? <Spinner /> : ""} */}
        {activeActionId === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
      </button>
    )
  }

  // ── Pending — current user is receiver ────────────────────────────────────
  if (connected === 'pending' && connectionRole === 'receiver') {
    return (
      <div className='flex flex-col items-center gap-2'>
        <button
          className={btnPrimary}
          onClick={() => connectId && onAccept(connectId)}
          disabled={isAnyMutationPending}
        >
          {/* {activeActionId === "accept" ? <Spinner /> : <UserCheck size={16} />} */}
          {activeActionId === 'accept' ? 'Accepting...' : 'Accept'}
        </button>
        <button
          className={btnDanger}
          onClick={() => connectId && onDecline(connectId)}
          disabled={isAnyMutationPending}
        >
          {/* {activeActionId === "decline" ? <Spinner /> : <UserX size={16} />} */}
          {activeActionId === 'decline' ? 'Declining...' : 'Decline'}
        </button>
      </div>
    )
  }

  // ── Accepted ───────────────────────────────────────────────────────────────
  if (
    connected === 'accepted' ||
    (connected !== null && connected !== 'pending')
  ) {
    return (
      <div className='flex flex-col items-center gap-2'>
        <button
          className={btnPrimary}
          onClick={onMessage}
          disabled={isAnyMutationPending}
        >
          {/* <MessageSquare size={16} /> */}
          Message
        </button>
        <button
          className={btnDanger}
          onClick={() => connectId && onRemove(connectId)}
          disabled={isAnyMutationPending}
        >
          {/* {activeActionId === "remove" ? <Spinner /> : <UserMinus size={16} />} */}
          {activeActionId === 'remove' ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    )
  }

  return null
}

// ─── Read-only sub-components (unchanged) ────────────────────────────────────

function ReadOnlyProfileImageCard ({
  imageSrc,
  firstName,
  lastName,
  userId,
  connectionButtons,
  location,
  onImageClick
}: {
  imageSrc: any
  firstName: any
  lastName: any
  userId?: string
  connectionButtons?: React.ReactNode
  location?: string
  onImageClick?: () => void
}) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  return (
    <div className={styles.profileImageCard}>
      <div className={styles.imageseditedsection_userProfile}>
        <div className={styles.imageCard}>
          <Avatar
            imageUrl={imageSrc}
            firstName={firstName}
            lastName={lastName}
            size={130}
            className='w-full h-full'
            onClick={onImageClick}
          />
        </div>
        <div>
          <div className={styles.nameWrapper}>
            <h2 className={styles.user_name}>
              {firstName} {lastName}
            </h2>
          </div>
          <div className=''>
            {/* <p
              className={`flex items-center gap-1 ${styles.location_text}`}
            >
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                >
                  <path
                    d="M7.49875 12.1961C8.72146 11.1015 9.65714 10.0516 10.3058 9.04637C10.9544 8.04116 11.2787 7.16075 11.2787 6.40512C11.2787 5.26575 10.9168 4.32908 10.1928 3.59512C9.46885 2.86116 8.57083 2.49418 7.49875 2.49418C6.42667 2.49418 5.52865 2.86116 4.80469 3.59512C4.08073 4.32908 3.71875 5.26575 3.71875 6.40512C3.71875 7.16075 4.04307 8.04116 4.69172 9.04637C5.34036 10.0516 6.27604 11.1015 7.49875 12.1961ZM7.49875 13.0878C7.37698 13.0878 7.25521 13.0668 7.13344 13.0248C7.01156 12.9827 6.90135 12.9176 6.80281 12.8295C6.24198 12.3126 5.71714 11.7803 5.22828 11.2326C4.73953 10.685 4.31469 10.1376 3.95375 9.59028C3.59271 9.04299 3.30703 8.50054 3.09672 7.96294C2.88641 7.42523 2.78125 6.90596 2.78125 6.40512C2.78125 4.96283 3.24776 3.79517 4.18078 2.90215C5.11391 2.00913 6.2199 1.56262 7.49875 1.56262C8.7776 1.56262 9.88359 2.00913 10.8167 2.90215C11.7497 3.79517 12.2162 4.96283 12.2162 6.40512C12.2162 6.90596 12.1111 7.42419 11.9008 7.95981C11.6905 8.49554 11.4058 9.03804 11.0469 9.58731C10.6878 10.1366 10.2639 10.684 9.77516 11.2297C9.28641 11.7754 8.76156 12.3066 8.20062 12.8234C8.10354 12.9115 7.99318 12.9776 7.86953 13.0217C7.74599 13.0657 7.6224 13.0878 7.49875 13.0878ZM7.49984 7.4159C7.81078 7.4159 8.07661 7.30517 8.29734 7.08372C8.51818 6.86226 8.62859 6.59606 8.62859 6.28512C8.62859 5.97418 8.51786 5.7083 8.29641 5.48747C8.07495 5.26674 7.8087 5.15637 7.49766 5.15637C7.18672 5.15637 6.92089 5.2671 6.70016 5.48856C6.47932 5.71002 6.36891 5.97627 6.36891 6.28731C6.36891 6.59825 6.47964 6.86408 6.70109 7.08481C6.92255 7.30554 7.1888 7.4159 7.49984 7.4159Z"
                    fill="#E3E3E3"
                  />
                </svg>
              </span>
              Location: {location}
            </p> */}
            <div
              className={`${styles.profile_info} ${styles.location_wrapper}`}
            >
              <span className={styles.location_text}>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='15'
                  height='15'
                  viewBox='0 0 15 15'
                  fill='none'
                >
                  <path
                    d='M7.49875 12.1961C8.72146 11.1015 9.65714 10.0516 10.3058 9.04637C10.9544 8.04116 11.2787 7.16075 11.2787 6.40512C11.2787 5.26575 10.9168 4.32908 10.1928 3.59512C9.46885 2.86116 8.57083 2.49418 7.49875 2.49418C6.42667 2.49418 5.52865 2.86116 4.80469 3.59512C4.08073 4.32908 3.71875 5.26575 3.71875 6.40512C3.71875 7.16075 4.04307 8.04116 4.69172 9.04637C5.34036 10.0516 6.27604 11.1015 7.49875 12.1961ZM7.49875 13.0878C7.37698 13.0878 7.25521 13.0668 7.13344 13.0248C7.01156 12.9827 6.90135 12.9176 6.80281 12.8295C6.24198 12.3126 5.71714 11.7803 5.22828 11.2326C4.73953 10.685 4.31469 10.1376 3.95375 9.59028C3.59271 9.04299 3.30703 8.50054 3.09672 7.96294C2.88641 7.42523 2.78125 6.90596 2.78125 6.40512C2.78125 4.96283 3.24776 3.79517 4.18078 2.90215C5.11391 2.00913 6.2199 1.56262 7.49875 1.56262C8.7776 1.56262 9.88359 2.00913 10.8167 2.90215C11.7497 3.79517 12.2162 4.96283 12.2162 6.40512C12.2162 6.90596 12.1111 7.42419 11.9008 7.95981C11.6905 8.49554 11.4058 9.03804 11.0469 9.58731C10.6878 10.1366 10.2639 10.684 9.77516 11.2297C9.28641 11.7754 8.76156 12.3066 8.20062 12.8234C8.10354 12.9115 7.99318 12.9776 7.86953 13.0217C7.74599 13.0657 7.6224 13.0878 7.49875 13.0878ZM7.49984 7.4159C7.81078 7.4159 8.07661 7.30517 8.29734 7.08372C8.51818 6.86226 8.62859 6.59606 8.62859 6.28512C8.62859 5.97418 8.51786 5.7083 8.29641 5.48747C8.07495 5.26674 7.8087 5.15637 7.49766 5.15637C7.18672 5.15637 6.92089 5.2671 6.70016 5.48856C6.47932 5.71002 6.36891 5.97627 6.36891 6.28731C6.36891 6.59825 6.47964 6.86408 6.70109 7.08481C6.92255 7.30554 7.1888 7.4159 7.49984 7.4159Z'
                    fill={isLight ? '#888888' : '#A0AEC0'}
                  />
                </svg>
                Location
              </span>
              {isLight ? (
                <p className={jobstyles.light_side_profile_location}>{location}</p>
              ) : (
                <p className='location-badge-design'>{location}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {connectionButtons && (
        <div className='flex gap-2'>{connectionButtons}</div>
      )}
      {/* {userId && process.env.NEXT_PUBLIC_APP_URL && (
        <div className={styles.qrWrapper}>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '8px',
              background: '#ffffff',
              borderRadius: '12px',
            }}
          >
            <QRCode
              value={`${process.env.NEXT_PUBLIC_APP_URL}/user/${userId}`}
              size={120}
              level='M'
              bgColor='#ffffff'
              fgColor='#000000'
            />
            <img
              src='/profile/qr_icon.png'
              alt='YP Logo'
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                background: '#ffffff',
                padding: '2px',
              }}
            />
          </div>
        </div>
      )} */}
    </div>
  )
}

function ReadOnlyProfileInfoCard ({
  firstName,
  lastName,
  email,
  phone,
  location,
  university,
  dob,
  gender
}: any) {
  const formatGenderLabel = (gender?: string) => {
    if (!gender) return ''
    return gender
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  return (
    <div className={styles.card_wrapper}>
      <div className='card_custom card_dark-bg'>
        <div className={styles.profileInfo}>
          <div>
            <div className={styles.nameWrapper}>
              <h2 className={styles.user_name}>
                {firstName} {lastName}
              </h2>
            </div>
            <div className={styles.profile_info_area}>
              <p
                className={`${styles.profile_info} ${styles.location_wrapper}`}
              >
                <span className={styles.location_text}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width={9}
                    height={11}
                    viewBox='0 0 9 10'
                    fill='none'
                  >
                    <path
                      d='M4.0885 9.21565C5.14818 8.26701 5.9591 7.3571 6.52126 6.48592C7.08342 5.61474 7.3645 4.85171 7.3645 4.19683C7.3645 3.20938 7.05078 2.3976 6.42335 1.7615C5.79592 1.1254 5.01764 0.807354 4.0885 0.807354C3.15936 0.807354 2.38108 1.1254 1.75365 1.7615C1.12622 2.3976 0.8125 3.20938 0.8125 4.19683C0.8125 4.85171 1.09358 5.61474 1.65574 6.48592C2.2179 7.3571 3.02882 8.26701 4.0885 9.21565ZM4.0885 9.98847C3.98297 9.98847 3.87743 9.97028 3.7719 9.9339C3.66627 9.89742 3.57076 9.841 3.48535 9.76463C2.9993 9.31667 2.54443 8.85535 2.12076 8.38067C1.69718 7.90608 1.32898 7.43162 1.01617 6.9573C0.703264 6.48298 0.455677 6.01286 0.273406 5.54694C0.0911355 5.08092 0 4.63089 0 4.19683C0 2.94685 0.404309 1.93488 1.21293 1.16093C2.02164 0.386975 2.98016 0 4.0885 0C5.19684 0 6.15536 0.386975 6.96407 1.16093C7.77269 1.93488 8.177 2.94685 8.177 4.19683C8.177 4.63089 8.08587 5.08002 7.90359 5.54423C7.72132 6.00853 7.47464 6.47869 7.16354 6.95473C6.85235 7.43076 6.48497 7.90522 6.06139 8.37809C5.6378 8.85106 5.18294 9.31148 4.69679 9.75934C4.61265 9.83572 4.517 9.893 4.40984 9.93119C4.30277 9.96938 4.19566 9.98847 4.0885 9.98847ZM4.08945 5.07284C4.35893 5.07284 4.58932 4.97688 4.78061 4.78495C4.972 4.59302 5.0677 4.36231 5.0677 4.09283C5.0677 3.82335 4.97173 3.59292 4.7798 3.40153C4.58787 3.21023 4.35712 3.11458 4.08755 3.11458C3.81807 3.11458 3.58768 3.21055 3.39639 3.40248C3.205 3.59441 3.1093 3.82516 3.1093 4.09473C3.1093 4.36421 3.20527 4.5946 3.3972 4.7859C3.58913 4.97719 3.81988 5.07284 4.08945 5.07284Z'
                      fill={isLight ? '#888888' : '#A0AEC0'}
                    />
                  </svg>
                  Location
                </span>
                {location}
              </p>
              {/* <p className={`${styles.profile_info} ${styles.location_wrapper}`}>
                <span className={styles.location_text}><MailIcon className={styles.location_icon} />Email</span>
                {email}
              </p> */}
              {phone && (
                <p
                  className={`${styles.profile_info} ${styles.location_wrapper}`}
                >
                  <span className={styles.location_text}>
                    <Phone className={styles.location_icon} />
                    Phone
                  </span>
                  {formatPhoneForDisplay(phone)}
                </p>
              )}
              {dob && (
                <p
                  className={`${styles.profile_info} ${styles.location_wrapper}`}
                >
                  <span className={styles.location_text}>
                    <Calendar className={styles.location_icon} />
                    DOB
                  </span>
                  {formateDOBDate(dob)}
                </p>
              )}
              {gender && (
                <p
                  className={`${styles.profile_info} ${styles.genderclass} ${styles.location_wrapper}`}
                >
                  <span className={styles.location_text}>
                    <svg
                      width={18}
                      height={18}
                      viewBox='0 0 17 17'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M13.8128 1.59375H11.1566C11.0157 1.59375 10.8806 1.64972 10.7809 1.74935C10.6813 1.84898 10.6253 1.9841 10.6253 2.125C10.6253 2.2659 10.6813 2.40102 10.7809 2.50065C10.8806 2.60028 11.0157 2.65625 11.1566 2.65625H12.5305L10.8604 4.32637C10.37 3.86935 9.77847 3.53482 9.13409 3.35009C8.48971 3.16536 7.81078 3.13568 7.15273 3.26346C6.49469 3.39124 5.8762 3.67287 5.34779 4.08534C4.81938 4.49781 4.39603 5.02942 4.11232 5.63675C3.8286 6.24409 3.69258 6.90992 3.71534 7.57987C3.73811 8.24982 3.91903 8.90488 4.24331 9.49156C4.5676 10.0782 5.02607 10.5799 5.58126 10.9555C6.13646 11.3312 6.77263 11.5702 7.43783 11.653V12.75H5.84408C5.70319 12.75 5.56806 12.806 5.46843 12.9056C5.3688 13.0052 5.31283 13.1404 5.31283 13.2812C5.31283 13.4221 5.3688 13.5573 5.46843 13.6569C5.56806 13.7565 5.70319 13.8125 5.84408 13.8125H7.43783V15.4062C7.43783 15.5471 7.4938 15.6823 7.59343 15.7819C7.69306 15.8815 7.82819 15.9375 7.96908 15.9375C8.10998 15.9375 8.2451 15.8815 8.34473 15.7819C8.44436 15.6823 8.50033 15.5471 8.50033 15.4062V13.8125H10.0941C10.235 13.8125 10.3701 13.7565 10.4697 13.6569C10.5694 13.5573 10.6253 13.4221 10.6253 13.2812C10.6253 13.1404 10.5694 13.0052 10.4697 12.9056C10.3701 12.806 10.235 12.75 10.0941 12.75H8.50033V11.653C9.21242 11.564 9.89034 11.296 10.4707 10.8739C11.0511 10.4518 11.515 9.8895 11.819 9.23947C12.1231 8.58944 12.2574 7.87293 12.2094 7.15692C12.1613 6.4409 11.9325 5.74875 11.5444 5.14516L13.2816 3.4073V4.78125C13.2816 4.92215 13.3376 5.05727 13.4372 5.1569C13.5368 5.25653 13.6719 5.3125 13.8128 5.3125C13.9537 5.3125 14.0889 5.25653 14.1885 5.1569C14.2881 5.05727 14.3441 4.92215 14.3441 4.78125V2.125C14.3441 1.9841 14.2881 1.84898 14.1885 1.74935C14.0889 1.64972 13.9537 1.59375 13.8128 1.59375ZM7.96908 10.625C7.33866 10.625 6.72238 10.4381 6.1982 10.0878C5.67402 9.73756 5.26547 9.23974 5.02422 8.6573C4.78296 8.07486 4.71984 7.43396 4.84283 6.81565C4.96582 6.19734 5.2694 5.62938 5.71518 5.1836C6.16096 4.73782 6.72892 4.43424 7.34723 4.31125C7.96555 4.18826 8.60645 4.25138 9.18889 4.49263C9.77133 4.73389 10.2691 5.14244 10.6194 5.66662C10.9696 6.1908 11.1566 6.80707 11.1566 7.4375C11.1557 8.28261 10.8196 9.09285 10.222 9.69043C9.62443 10.288 8.81419 10.6241 7.96908 10.625Z'
                        fill='#A0AEC0'
                      />
                    </svg>
                    Gender
                  </span>
                  {formatGenderLabel(gender)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReadOnlyEducationCard ({
  university,
  degree,
  duration
}: {
  university: string
  degree: string
  duration: string
}) {
  return (
    <div className={styles.educationCard}>
      <div className='card_custom card_dark-bg'>
        <div className={styles.profileInfo}>
          <div className={`${styles.nameWrapper}`}>
            <h2 className={styles.section_title}>Education</h2>
          </div>
          <div className={styles.education_wrapper}>
            <div className={styles.university_Image_area}>
              <Image
                src={DummyUniversity}
                alt='University'
                width={100}
                height={100}
              />
            </div>
            <div className={styles.educationItem_inner}>
              <div className={styles.educationItem}>
                <p className={styles.university_name}>{university}</p>
              </div>
              <div className={styles.educationItem}>
                <p className={styles.degree}>{degree}</p>
              </div>
              <div className={styles.educationItem}>
                <p className={styles.duration}>{duration}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReadOnlySkillsCard ({ skills }: { skills: string[] | string }) {
  const localSkills = Array.isArray(skills)
    ? skills
    : (skills ?? '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)

  return (
    <div className={styles.skillsCard}>
      <div className='card_custom card_dark-bg'>
        <div className={styles.profileInfo}>
          <div className={styles.nameWrapper}>
            <h2 className={styles.section_title}>Skills</h2>
          </div>
        </div>
        <div className={styles.skills}>
          {localSkills.length > 0 ? (
            localSkills.map((skill: string, index: number) => (
              <span key={`${skill}-${index}`} className={styles.skillPill}>
                {skill}
              </span>
            ))
          ) : (
            <p className='text-gray-400'>No skills added yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadOnlyAboutCard ({ about }: { about: string }) {
  return (
    <div className='mt-4'>
      <div className='card_custom min-h-36'>
        <div className={styles.profileInfo}>
          <div className={styles.nameWrapper}>
            <h2 className={styles.section_title}>About</h2>
          </div>
          <p className={`${styles.profile_info} ${styles.about_description}`}>
            {about || 'No information added yet.'}
          </p>
        </div>
      </div>
    </div>
  )
}
