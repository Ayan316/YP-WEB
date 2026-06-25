'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/context/ThemeContext'
import { ensureValidToken } from '@/lib/tokenManager'
import { getBookingDetail } from '@/services/events.services'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined'
import BookingDetailSkeleton from '../commonUI/loaders/skeletons/BookingDetailSkeleton'
import styles from '@/moduleCss/events.module.css'
import EventDefaultImage from '../../../public/images/DummyUniversity.jpg'
import {
  isSurveyMonkeyEvent,
  mapToProvisionalStatus,
  getProvisionalStatusDisplay,
} from '@/types/eventStatus'

type Props = {
  bookingId: string
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const isSameCalendarDay = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false
  const d1 = new Date(a)
  const d2 = new Date(b)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const formatEventDateRange = (startStr?: string | null, endStr?: string | null) => {
  if (!startStr) return ''
  if (!endStr || isSameCalendarDay(startStr, endStr)) return formatDate(startStr)
  return `${formatDate(startStr)} - ${formatDate(endStr)}`
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // hour: 'numeric',
    // minute: '2-digit',
    hour12: true,
  })
}

const getBookingStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: 'Confirmed' }
    case 'pending':
      return { background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', label: 'Registration Started' }
    case 'cancelled':
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Not Selected' }
    case 'refunded':
      return { background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: 'Refunded' }
    default:
      return { background: 'rgba(107, 114, 128, 0.15)', color: '#6B7280', label: status }
  }
}


const getPaymentStatusStyle = (status: string) => {
  switch (status) {
    case 'completed':
      return { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: 'Paid' }
    case 'pending':
      return { background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', label: 'Pending' }
    case 'failed':
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Failed' }
    case 'refunded':
      return { background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: 'Refunded' }
    default:
      return { background: 'rgba(107, 114, 128, 0.15)', color: '#6B7280', label: 'Processing' }
  }
}


export default function BookingDetailLayout({ bookingId }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const {
    data: bookingResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async () => {
      await ensureValidToken()
      return getBookingDetail({ booking_id: bookingId })
    },
    enabled: !!bookingId,
  })

  const booking = bookingResponse?.data

  const bannerUrl = booking?.event?.banner_image_url
    ? booking.event.banner_image_url.startsWith('http')
      ? booking.event.banner_image_url
      : `${process.env.NEXT_PUBLIC_STORAGE_URL || ''}${booking.event.banner_image_url}`
    : null

  let imageUrl: string | null = null
  if (bannerUrl) {
    try {
      new URL(bannerUrl)
      imageUrl = bannerUrl
    } catch {
      imageUrl = null
    }
  }

  return (
    <div className='container mx-auto px-4'>
      <div className={styles.event_details_page}>
        {/* Header */}
        <div className={styles.event_details_header}>
          <button
            onClick={() => {
              sessionStorage.setItem('events_active_tab', 'bookings')
              router.push('/events')
            }}
            className={styles.event_details_back_btn}
            style={{ color: isLight ? '#040F1F' : '#ffffff' }}
          >
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </button>
          <h1
            className={styles.event_details_heading}
            style={{ color: isLight ? '#040F1F' : '#ffffff' }}
          >
            Booking Details
          </h1>
        </div>

        {/* Loading */}
        {isLoading && <BookingDetailSkeleton />}

        {/* Error */}
        {(isError || (!isLoading && !booking)) && (
          <div className={styles.event_details_error}>
            <p style={{ color: isLight ? '#555' : '#a0aec0' }}>
              {isError ? 'Failed to load booking details.' : 'Booking not found.'}
            </p>
            <button
              onClick={() => router.push('/events')}
              className={styles.event_details_back_to_events_btn}
            >
              Back to Events
            </button>
          </div>
        )}

        {/* Content */}
        {booking && (() => {
          const paymentStatusStyle = getPaymentStatusStyle(booking.payment?.payment_status || '')
          const isFreeBooking =
            String(booking.event?.event_type_display || '').toLowerCase() === 'free'
          const externalRegistrationUrl =
            booking.event?.external_registration_url ?? null
          const isSurveyMonkey = isSurveyMonkeyEvent({
            external_registration_url: externalRegistrationUrl,
            pricing_type: booking.event?.pricing_type,
            event_type_display: booking.event?.event_type_display,
          })
          const provisionalStatus = mapToProvisionalStatus(booking.booking_status)
          const provisionalDisplay = getProvisionalStatusDisplay(provisionalStatus)

          return (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              {/* Main Card */}
              <div
                className={styles.ed_payment_card}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.5)',
                  borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
                  padding: 0,
                  overflow: 'hidden',
                  marginBottom: 20,
                }}
              >
                {/* Banner Image */}
                <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', background: 'rgba(32, 189, 255, 0.10)' }}>
                  <Image
                    src={imageUrl || EventDefaultImage}
                    alt={booking.event?.title || 'Event'}
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                  {/* Gradient Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 80,
                      background: `linear-gradient(to top, ${isLight ? 'rgba(255,255,255,0.9)' : 'rgba(2,12,25,0.85)'}, transparent)`,
                    }}
                  />
                </div>

                {/* Card Body */}
                <div style={{ padding: 20 }}>
                  {/* Event Title */}
                  {booking.event?.title && (
                    <h2
                      style={{
                        margin: '0 0 6px',
                        fontSize: 20,
                        fontWeight: 700,
                        color: isLight ? '#040F1F' : '#ffffff',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {booking.event.title}
                    </h2>
                  )}

                  {/* Date & Time */}
                  {booking.event?.start_datetime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                      <CalendarTodayOutlinedIcon style={{ fontSize: 14, color: isLight ? '#555' : '#a0aec0' }} />
                      <span
                        style={{
                          fontSize: 13,
                          color: isLight ? '#555' : '#a0aec0',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {formatEventDateRange(
                          booking.event.start_datetime,
                          booking.event.end_datetime
                        )}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`, marginBottom: 16 }} />

                  {/* Booking Info Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: isLight ? '#888' : '#718096', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Booking Number
                      </p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {booking.booking_number}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: isLight ? '#888' : '#718096', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {isSurveyMonkey ? 'Requested seat' : 'Seats'}
                      </p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {booking.num_seats}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`, marginBottom: 16 }} />

                  {isFreeBooking ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Total Amount
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: isLight ? '#356FEE' : '#06c1fa', fontFamily: "'DM Sans', sans-serif" }}>
                          Free
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Payment Breakdown */}
                      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Payment Summary
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                            Unit Price
                          </span>
                          <span style={{ fontSize: 13, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
                            {'\u00A3'}{booking.unit_price}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                            Subtotal ({booking.num_seats} {booking.num_seats > 1 ? 'seats' : 'seat'})
                          </span>
                          <span style={{ fontSize: 13, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
                            {'\u00A3'}{booking.subtotal}
                          </span>
                        </div>
                        {booking.coupon_code && parseFloat(booking.discount_amount) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#22c55e', fontFamily: "'DM Sans', sans-serif" }}>
                              Coupon ({booking.coupon_code})
                            </span>
                            <span style={{ fontSize: 13, color: '#22c55e', fontFamily: "'DM Sans', sans-serif" }}>
                              - {'\u00A3'}{booking.discount_amount}
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 10,
                            borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.15)'}`,
                            marginTop: 4,
                          }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Total Amount
                          </span>
                          <span style={{ fontSize: 20, fontWeight: 700, color: isLight ? '#356FEE' : '#06c1fa', fontFamily: "'DM Sans', sans-serif" }}>
                            {'\u00A3'}{booking.total_amount}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Status Details */}
                  <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`, margin: '16px 0' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                        {isFreeBooking ? 'Status' : 'Booking Status'}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '2px 10px',
                          borderRadius: 20,
                          background:
                            isSurveyMonkey
                              ? provisionalDisplay.badgeBackground
                              : getBookingStatusColor(booking.booking_status).background,
                          color:
                            isSurveyMonkey
                              ? provisionalDisplay.badgeColor
                              : getBookingStatusColor(booking.booking_status).color,
                          border: isSurveyMonkey
                            ? `1px solid ${provisionalDisplay.badgeColor}`
                            : 'none',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          textTransform: 'capitalize',
                        }}
                      >
                        {isSurveyMonkey
                          ? provisionalStatus === 'conditional_place'
                            ? 'Registration Started'
                            : provisionalDisplay.shortLabel
                          : getBookingStatusColor(booking.booking_status).label}
                      </span>
                    </div>
                    {isFreeBooking ? (
                      (booking.created_at || booking.booked_at) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                            Applied At
                          </span>
                          <span style={{ fontSize: 13, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AccessTimeIcon style={{ fontSize: 13 }} />
                            {formatDateTime(booking.created_at || booking.booked_at)}
                          </span>
                        </div>
                      )
                    ) : (
                      booking.payment && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                              Payment Status
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '2px 10px',
                                borderRadius: 20,
                                background: paymentStatusStyle.background,
                                color: paymentStatusStyle.color,
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                textTransform: 'uppercase',
                              }}
                            >
                              {paymentStatusStyle.label}
                            </span>
                          </div>
                          {booking.payment.paid_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                                Paid at
                              </span>
                              <span style={{ fontSize: 13, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AccessTimeIcon style={{ fontSize: 13 }} />
                                {formatDateTime(booking.payment.paid_at)}
                              </span>
                            </div>
                          )}
                          {booking.payment.refunded_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, color: isLight ? '#555' : '#a0aec0', fontFamily: "'DM Sans', sans-serif" }}>
                                Refunded at
                              </span>
                              <span style={{ fontSize: 13, color: isLight ? '#040F1F' : '#ffffff', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AccessTimeIcon style={{ fontSize: 13 }} />
                                {formatDateTime(booking.payment.refunded_at)}
                              </span>
                            </div>
                          )}
                          {booking.payment.failure_reason && (
                            <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
                              Reason: {booking.payment.failure_reason}
                            </p>
                          )}
                        </>
                      )
                    )}
                  </div>

                  {isSurveyMonkey && (provisionalStatus === 'registration_started' || provisionalStatus === 'conditional_place') && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.12)',
                        border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'}`,
                        marginTop: 16,
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
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: isLight ? '#92400E' : '#FCD34D',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        This is a provisional registration. Please complete the Survey form
                        to be considered for a place. Young Professionals will email you separately
                        if your place is confirmed.
                      </p>
                    </div>
                  )}

                  {isSurveyMonkey && provisionalStatus === 'confirmed' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isLight ? 'rgba(34, 197, 94, 0.10)' : 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        marginTop: 16,
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

                  {isSurveyMonkey && provisionalStatus === 'not_selected' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        marginTop: 16,
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
                        You were not selected for this event by Young Professionals. We encourage
                        you to apply for upcoming opportunities.
                      </p>
                    </div>
                  )}

                  {isSurveyMonkey && provisionalStatus === 'registration_started' && booking.event?.external_registration_url && (
                    <div style={{ marginTop: 16 }}>
                      <a
                        href={booking.event.external_registration_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={styles.ed_book_now_btn}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          textDecoration: 'none',
                        }}
                        aria-label='Complete Survey Monkey  Form'
                      >
                        Complete Survey Monkey  Form
                      </a>
                    </div>
                  )}

                  {/* Receipt Link */}
                  {!isFreeBooking && booking.payment?.stripe_receipt_url && (
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <a
                        href={booking.payment.stripe_receipt_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: isLight ? '#356FEE' : '#06c1fa',
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: 'none',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        <ConfirmationNumberOutlinedIcon style={{ fontSize: 16 }} />
                        View Payment Receipt
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                {booking.event?.id && (() => {
                  // status === "5" means the event was deleted by admin
                  const isDeleted = String(booking.event.status) === '5'
                  const isDraft = booking.event.event_status === 'draft'
                  const isViewDisabled = isDraft || isDeleted
                  return (
                    <div style={{ flex: 1, position: 'relative' }} className={styles.ed_view_event_wrapper}>
                      <button
                        onClick={() => {
                          if (!isViewDisabled) {
                            router.push(`/events/${booking.event.id}`)
                          }
                        }}
                        className={styles.ed_book_now_btn}
                        disabled={isViewDisabled}
                        style={{
                          width: '100%',
                          ...(isViewDisabled && {
                            opacity: 0.5,
                            cursor: 'not-allowed',
                          }),
                        }}
                      >
                        View Event
                      </button>
                      {isViewDisabled && (
                        <span className={styles.ed_view_event_tooltip}>
                          {isDeleted ? 'This event has been removed' : 'This event is no longer available'}
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
