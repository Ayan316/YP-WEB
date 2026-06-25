import styles from "../../moduleCss/messages.module.css";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Avatar from "../commonUI/Avatar";
import { useState, useEffect } from "react";
import ProfileImagePreview from "../commonUI/ProfileImagePreview";
import { useTheme } from "@/context/ThemeContext";
import jobstyles from "@/moduleCss/jobs.module.css";
import ReportDialog from "../moderation/ReportDialog";
import ConfirmModal from "../commonUI/ConfirmModal";
import { blockUser } from "@/services/moderation.services";
import { isUnauthenticatedError } from "@/lib/authError";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthGate } from "@/app/hooks/useAuthGate";

// Optimistically strip the blocked user's conversation from the cached list
// that powers ConversationList so the chat disappears immediately without
// waiting for the server response.
function removeConversationForUser(oldData: any, blockedUserId: string) {
  if (!oldData?.data?.result) return oldData;
  return {
    ...oldData,
    data: {
      ...oldData.data,
      result: oldData.data.result.filter(
        (chat: any) => chat?.users?.id !== blockedUserId,
      ),
    },
  };
}
type Props = {
  user: {
    name?: string
    first_name?: string
    last_name?: string
    avatar?: string | null
    location?: string
    id?: string
  }
}

export default function ChatHeader ({ user }: Props) {
  const router = useRouter()
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const qc = useQueryClient()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const handleBlockConfirm = async () => {
    ensureAuthed("block this user", async () => {
      const userName = user?.name || user?.first_name || 'this user'
      const blockedUserId = user?.id ?? ''
      if (!blockedUserId) return

      // Optimistic UI: drop the conversation from the cached list and step the
      // URL off the blocked chat before the server call completes so the user
      // sees immediate feedback.
      const previousConversations = qc.getQueryData(["conversations"])
      qc.setQueryData(["conversations"], (oldData: any) =>
        removeConversationForUser(oldData, blockedUserId),
      )
      setBlockOpen(false)
      setMenuOpen(false)
      router.replace('/messages')

      setBlockLoading(true)
      try {
        await blockUser(blockedUserId)
        toast.success(`${userName} has been blocked.`)
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["feeds"] }),
          qc.invalidateQueries({ queryKey: ["conversations"] }),
          qc.invalidateQueries({ queryKey: ["comments"] }),
          qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
        ])
      } catch (err: any) {
        const msg: string = err?.response?.data?.message ?? err?.message ?? ""
        // Rollback the optimistic removal so the conversation reappears.
        if (previousConversations !== undefined) {
          qc.setQueryData(["conversations"], previousConversations)
        } else {
          qc.invalidateQueries({ queryKey: ["conversations"] })
        }
        if (isUnauthenticatedError(err)) {
          openGate("block this user")
        } else if (!/cannot block yourself/i.test(msg) && !/User is not blocked/i.test(msg)) {
          toast.error(msg || "Action failed. Please try again.")
        }
      } finally {
        setBlockLoading(false)
      }
    })
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (menuOpen && !target.closest('[data-chat-menu]')) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <>
    <div className={`${styles.chatHeader_wrapper}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Avatar
        imageUrl={user?.avatar || null}
        firstName={user?.first_name}
        lastName={user?.last_name}
        className={`w-full h-full object-cover ${styles.chatHeader_avatar} cursor-pointer`}
        onClick={() => setIsImagePreviewOpen(true)}
      />

      <div>
        <h3
          className={`${styles.chatHeader_title} cursor-pointer`}
          onClick={() => router.push(`/user/${user.id}`)}
          style={isLight ? { color: '#040F1F' } : {}}
        >
          {user.name || 'Unknown User'}
        </h3>
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
            {user.location || 'Not Specified'}
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
            {user.location || 'Not Specified'}
          </p>
        )}
      </div>

      {/* 3-dot menu */}
      {user?.id && (
        <div style={{ position: 'relative', marginLeft: 'auto' }} data-chat-menu>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 256 256">
              <path fill={isLight ? '#040F1F' : '#a0aec0'} d="M156 128a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-28-52a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0 104a28 28 0 1 0 28 28a28 28 0 0 0-28-28" />
            </svg> */}
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 50,
                background: isLight ? '#fff' : '#0d1b2e',
                border: isLight ? '1px solid #E8EEFE' : '1px solid #2d3748',
                borderRadius: '8px',
                boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.4)',
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => ensureAuthed("report this", () => { setMenuOpen(false); setReportOpen(true); })}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  color: isLight ? '#040F1F' : '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? '#F4F6FF' : '#1a2744')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report User
              </div>
              <div style={{ height: '1px', background: isLight ? '#E8EEFE' : '#2d3748', margin: '0 12px' }} />
              <div
                onClick={() => { setMenuOpen(false); setBlockOpen(true); }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? '#FEF2F2' : '#1a2744')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Block User
              </div>
            </div>
          )}
        </div>
      )}

      <ProfileImagePreview
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={user?.avatar}
        firstName={user?.first_name}
        lastName={user?.last_name}
      />
    </div>

    <ReportDialog
      open={reportOpen}
      onClose={() => setReportOpen(false)}
      reportedType="user"
      reportedId={user?.id ?? ''}
    />
    <ConfirmModal
      isOpen={blockOpen}
      onClose={() => setBlockOpen(false)}
      onConfirm={handleBlockConfirm}
      title={`Block User`}
      message={`Are you sure you want to block ${ user?.name || user?.first_name || 'this user'}? You won't see their posts, comments, or messages.`}
      confirmText="Block"
      cancelText="Cancel"
      isLoading={blockLoading}
      loadingText="Blocking…"
    />
    {authGateModal}
    </>
  )
}
