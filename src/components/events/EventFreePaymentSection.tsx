'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { useQueryClient } from '@tanstack/react-query'
import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'
import { ensureValidToken } from '@/lib/tokenManager'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import { createBooking } from '@/services/events.services'
import Link from 'next/link'
import RegistrationStartedModal from './RegistrationStartedModal'
import { isSurveyMonkeyEvent } from '@/types/eventStatus'

interface EventFreePaymentSectionProps {
  eventId: string
  external_registration_url: string | null
  is_registration_open: boolean
  availability_status: string
  user_booking: {
    booking_id: string
    booking_status: string
    num_seats: number
  } | null
  isLoading?: boolean
}

const EventFreePaymentSectionSkeleton = () => {
  return (
    <div className={styles.ed_payment_card}>
      <div className={styles.ed_skeleton_pricing_header} />
      <div className={styles.ed_skeleton_block} style={{ height: 44 }} />
    </div>
  )
}

const EventFreePaymentSection = ({
  eventId,
  external_registration_url,
  is_registration_open,
  availability_status,
  user_booking,
  isLoading,
}: EventFreePaymentSectionProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const queryClient = useQueryClient()
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  const [optimisticBooking, setOptimisticBooking] = useState<{
    booking_id: string
    booking_status: string
    num_seats: number
  } | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showStartedModal, setShowStartedModal] = useState(false)

  const isSurveyMonkey = isSurveyMonkeyEvent(external_registration_url)

  const activeBooking = optimisticBooking || user_booking
  const bookingStatusLower = (activeBooking?.booking_status || '').toLowerCase()
  const isCancelledBooking =
    bookingStatusLower === 'cancelled' ||
    bookingStatusLower === 'rejected' ||
    bookingStatusLower === 'not_selected'
  const isConfirmedBooking = bookingStatusLower === 'confirmed'
  const hasActiveBooking = !!activeBooking && !isCancelledBooking

  if (isLoading) return <EventFreePaymentSectionSkeleton />

  const isClosed = availability_status === 'registration_closed' || !is_registration_open

  const openSurveyForm = () => {
    if (external_registration_url) {
      window.open(external_registration_url, '_blank', 'noopener,noreferrer')
    }
  }

  const submitBooking = async (): Promise<boolean> => {
    try {
      await ensureValidToken()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await createBooking({ event_id: eventId, num_seats: 1 })) as any

      if (data?.status === 'OK' && data?.data?.booking_id) {
        const bookingId = data.data.booking_id
        setOptimisticBooking({
          booking_id: bookingId,
          // For SurveyMonkey events the user's place is provisional until
          // Young Professionals manually approves and emails them. We never
          // optimistically mark it confirmed.
          booking_status: isSurveyMonkey ? 'registration_started' : 'confirmed',
          num_seats: 1,
        })
        queryClient.invalidateQueries({ queryKey: ['event-details'] })
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        return true
      }

      toast.error(data?.message || 'Failed to register for event')
      return false
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        openGate('book this event')
        return false
      }
      const message =
        error instanceof Error ? error.message : 'Failed to register for event'
      toast.error(message)
      return false
    }
  }

  // Apply Now: open the modal immediately. No API call yet, no loading
  // state on the Apply Now button — the modal explains the next step and
  // the API runs only when the user confirms by clicking "Complete form".
  const handleRegister = () => {
    ensureAuthed('book this event', () => {
      if (isSurveyMonkey) {
        setShowStartedModal(true)
        return
      }
      void (async () => {
        if (isRegistering) return
        setIsRegistering(true)
        const ok = await submitBooking()
        if (ok) {
          if (external_registration_url) {
            window.open(external_registration_url, '_blank', 'noopener,noreferrer')
          }
          toast.success('Booking Successful')
        }
        setIsRegistering(false)
      })()
    })
  }

  const handleCompleteFormFromModal = async () => {
    if (isRegistering) return
    setIsRegistering(true)
    const ok = await submitBooking()
    if (ok) {
      toast.success('Registration started')
      openSurveyForm()
      setShowStartedModal(false)
    }
    setIsRegistering(false)
  }

  return (
    <div
      className={styles.ed_payment_card}
      style={{
        background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.5)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
      }}
    >
      {/* Free Event Pricing Header */}
      <div className={styles.ed_free_pricing_header}>
        <div className={styles.ed_free_pricing_left}>
          <span className={styles.ed_pricing_label}>Event Registration</span>
          <span className={styles.ed_pricing_sublabel}>(Per person)</span>
        </div>
        <span className={styles.ed_free_badge}>FREE</span>
      </div>

      {/* SurveyMonkey provisional notice — only after the user has applied
          and place is still pending (not confirmed) */}
      {isSurveyMonkey && hasActiveBooking && !isConfirmedBooking && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 12,
            background: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'}`,
            margin: '16px 0',
          }}
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' stroke='#B45309' strokeWidth='1.8' />
            <line x1='12' y1='8' x2='12' y2='13' stroke='#B45309' strokeWidth='1.8' strokeLinecap='round' />
            <circle cx='12' cy='16.5' r='1.1' fill='#B45309' />
          </svg>
          <div>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 14,
                fontWeight: 700,
                color: isLight ? '#92400E' : '#FCD34D',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Your place is not confirmed yet
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: isLight ? '#92400E' : '#FCD34D',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Please complete the Survey form and wait for an email from Young Professionals
              confirming your place.
            </p>
          </div>
        </div>
      )}

      {/* Confirmed (free) notice */}
      {isSurveyMonkey && hasActiveBooking && isConfirmedBooking && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 12,
            background: isLight ? 'rgba(34, 197, 94, 0.10)' : 'rgba(34, 197, 94, 0.12)',
            border: `1px solid ${isLight ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.35)'}`,
            margin: '16px 0',
          }}
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' stroke='#15803D' strokeWidth='1.8' />
            <path d='M8 12.5l2.5 2.5 5-5' stroke='#15803D' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: isLight ? '#15803D' : '#86EFAC',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Your place is confirmed by Young Professionals. Check your email for joining details.
          </p>
        </div>
      )}

      {/* Not Selected (cancelled / rejected) notice */}
      {isSurveyMonkey && !!activeBooking && isCancelledBooking && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 12,
            background: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${isLight ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            margin: '16px 0',
          }}
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' stroke='#B91C1C' strokeWidth='1.8' />
            <line x1='8.5' y1='8.5' x2='15.5' y2='15.5' stroke='#B91C1C' strokeWidth='1.8' strokeLinecap='round' />
            <line x1='15.5' y1='8.5' x2='8.5' y2='15.5' stroke='#B91C1C' strokeWidth='1.8' strokeLinecap='round' />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: isLight ? '#B91C1C' : '#FCA5A5',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            You were not selected for this event by Young Professionals. We encourage you to apply
            for upcoming opportunities.
          </p>
        </div>
      )}

      {/* Info Text */}
      {!hasActiveBooking && !isSurveyMonkey && (
        <p
          className={styles.ed_free_info_text}
          style={{ color: isLight ? '#555' : '#FFF' }}
        >
          Join this event for free. <br />
          No booking required. Simply apply now to secure your spot.
        </p>
      )}

      {/* Action Button */}
      {isSurveyMonkey && !!activeBooking && isCancelledBooking ? (
        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <button
            type='button'
            disabled
            className={styles.ed_sold_out_btn}
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              cursor: 'not-allowed',
            }}
            aria-label='Not Selected'
          >
            Not Selected
          </button>
        </div>
      ) : !hasActiveBooking ? (
        <div>
          {isClosed ? (
            <button
              className={styles.ed_sold_out_btn}
              style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%' }}
              disabled
              aria-label='Registration Closed'
            >
              Registration Closed
            </button>
          ) : (
            <button
              onClick={handleRegister}
              // For SurveyMonkey events Apply Now opens the modal instantly
              // (no API/loading on this button). The "Complete form" button
              // inside the modal handles the API and shows the spinner.
              disabled={!isSurveyMonkey && isRegistering}
              className={styles.ed_book_now_btn}
              style={{
                width: '100%',
                opacity: !isSurveyMonkey && isRegistering ? 0.8 : 1,
                cursor: !isSurveyMonkey && isRegistering ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: '10px',
              }}
            >
              {!isSurveyMonkey && isRegistering ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'freeRegisterSpin 0.7s linear infinite',
                    }}
                  />
                  Applying...
                </>
              ) : (
                'Apply Now'
              )}
              <style>{`
                @keyframes freeRegisterSpin { to { transform: rotate(360deg); } }
              `}</style>
            </button>
          )}
        </div>
      ) : isSurveyMonkey ? (
        isConfirmedBooking ? (
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <button
              type='button'
              disabled
              className={styles.ed_booked_btn}
              style={{
                width: '100%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22C55E',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                cursor: 'default',
              }}
              aria-label='Confirmed'
            >
              Confirmed
            </button>
          </div>
        ) : (
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <button
              type='button'
              onClick={openSurveyForm}
              className={styles.ed_book_now_btn}
              style={{ width: '100%' }}
              aria-label='Complete Survey Monkey  Form'
            >
              Complete Survey Monkey  Form
            </button>
          </div>
        )
      ) : (
        <div style={{ padding: '24px 0 8px', display: 'flex', justifyContent: 'center' }}>
          {external_registration_url ? (
            <Link
              href={external_registration_url}
              target='_blank'
              rel='noopener,noreferrer'
              className={styles.ed_booked_btn}
              style={{ width: '100%' }}
              aria-label='Registered'
            >
              Applied
            </Link>
          ) : (
            <button
              type='button'
              disabled
              className={styles.ed_booked_btn}
              style={{
                width: '100%',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#EAB308',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                cursor: 'default',
              }}
              aria-label='Registration Started'
            >
              Registration Started
            </button>
          )}
        </div>
      )}

      <RegistrationStartedModal
        open={showStartedModal}
        onClose={() => {
          if (!isRegistering) setShowStartedModal(false)
        }}
        onCompleteForm={handleCompleteFormFromModal}
        isSubmitting={isRegistering}
      />

      {authGateModal}
    </div>
  )
}

export default EventFreePaymentSection
