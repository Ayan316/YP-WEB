'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useTheme } from '@/context/ThemeContext'
import { ensureValidToken } from '@/lib/tokenManager'
import { getBookingDetail } from '@/services/events.services'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import styles from '@/moduleCss/events.module.css'
import EventDefaultImage from '../../../public/images/DummyUniversity.jpg'
import {
  isSurveyMonkeyEvent,
  mapToProvisionalStatus,
  getProvisionalStatusDisplay,
} from '@/types/eventStatus'

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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${day} ${month} ${year} at ${time}`
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

const getBookingStatusStyle = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: 'Confirmed' }
    case 'pending':
      return { background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', label: 'Pending' }
    case 'cancelled':
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Cancelled' }
    case 'refunded':
      return { background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: 'Refunded' }
    default:
      return { background: 'rgba(107, 114, 128, 0.15)', color: '#6B7280', label: status }
  }
}

export default function BookingConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const bookingId = searchParams.get('booking_id')
  const externalRegistrationUrl = searchParams.get('external_registration_url')
  const isFreeEvent = searchParams.get('is_free') === '1'

  const { data: bookingResponse, isLoading, isError } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async () => {
      await ensureValidToken()
      return getBookingDetail({ booking_id: bookingId! })
    },
    enabled: !!bookingId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.data?.payment?.payment_status === 'pending') {
        return 3000
      }
      return false
    },
  })

  const booking = bookingResponse?.data

  const isSurveyMonkey = isSurveyMonkeyEvent({
    external_registration_url: externalRegistrationUrl,
    pricing_type: booking?.event?.pricing_type,
    event_type_display: booking?.event?.event_type_display,
  })

  const toastShown = useRef(false)
  useEffect(() => {
    if (!booking || toastShown.current) return
    if (isSurveyMonkey) {
      toast.success('Registration started')
      toastShown.current = true
      return
    }
    if (booking.booking_status !== 'confirmed') return
    if (isFreeEvent) {
      toast.success('Registration Confirmed!')
      toastShown.current = true
      return
    }
    if (booking.payment?.payment_status === 'completed') {
      toast.success('Booking Confirmed!')
      toastShown.current = true
    }
  }, [booking, isFreeEvent, isSurveyMonkey])

  // The paid- and free-event flows now redirect the current tab to the
  // external registration URL directly from their own components (so the
  // browser always honours the click gesture). This page is only reached as
  // a fallback for bookings without an external URL, so there is nothing to
  // auto-open here — the inline "Open it here →" link remains as a manual
  // escape hatch for the edge cases.

  const getStatusDisplay = () => {
    if (!booking) return null
    const paymentStatus = booking.payment?.payment_status
    const bookingStatus = booking.booking_status

    if (isSurveyMonkey) {
      const provisional = mapToProvisionalStatus(bookingStatus)
      if (provisional === 'confirmed') {
        return {
          icon: <CheckCircleOutlineIcon style={{ fontSize: 48, color: '#22c55e' }} />,
          title: 'Confirmed',
          subtitle: 'Your place has been confirmed. Please check your email for event instructions.',
        }
      }
      if (provisional === 'not_selected') {
        return {
          icon: <ErrorOutlineIcon style={{ fontSize: 48, color: '#6b7280' }} />,
          title: 'Not selected',
          subtitle: 'You were not allocated a place for this event.',
        }
      }
      if (provisional === 'cancelled') {
        return {
          icon: <ErrorOutlineIcon style={{ fontSize: 48, color: '#ef4444' }} />,
          title: 'Cancelled',
          subtitle: 'This registration has been cancelled.',
        }
      }
      return {
        icon: <HourglassEmptyIcon style={{ fontSize: 48, color: '#B45309' }} />,
        title: 'Registration started',
        subtitle:
          'Your place is not confirmed yet. Please complete the SurveyMonkey form. Young Professionals will review your submission and email you separately if your place is confirmed.',
      }
    }

    if (isFreeEvent && bookingStatus === 'confirmed') {
      return {
        icon: <CheckCircleOutlineIcon style={{ fontSize: 48, color: '#22c55e' }} />,
        title: 'Registration Confirmed!',
        subtitle: 'You are registered for this free event.',
      }
    }

    if (paymentStatus === 'completed' && bookingStatus === 'confirmed') {
      return {
        icon: <CheckCircleOutlineIcon style={{ fontSize: 48, color: '#22c55e' }} />,
        title: 'Booking Confirmed!',
        subtitle: 'Your payment was successful and your booking is confirmed.',
      }
    }
    if (paymentStatus === 'pending') {
      return {
        icon: <HourglassEmptyIcon style={{ fontSize: 48, color: '#f59e0b' }} />,
        title: 'Payment Processing',
        subtitle: 'Your payment is being processed. This page will update automatically.',
      }
    }
    if (paymentStatus === 'failed' || bookingStatus === 'cancelled') {
      return {
        icon: <ErrorOutlineIcon style={{ fontSize: 48, color: '#ef4444' }} />,
        title: 'Payment Failed',
        subtitle: booking.payment?.failure_reason || 'Your payment could not be processed.',
      }
    }
    if (paymentStatus === 'refunded' || bookingStatus === 'refunded') {
      return {
        icon: <ErrorOutlineIcon style={{ fontSize: 48, color: '#6b7280' }} />,
        title: 'Booking Refunded',
        subtitle: 'This booking has been cancelled and refunded.',
      }
    }
    return {
      icon: <HourglassEmptyIcon style={{ fontSize: 48, color: '#f59e0b' }} />,
      title: 'Processing...',
      subtitle: 'Please wait while we confirm your booking.',
    }
  }

  if (!bookingId) {
    return (
      <div className='container mx-auto px-4'>
        <div className={styles.event_details_page}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <ErrorOutlineIcon style={{ fontSize: 64, color: '#ef4444' }} />
            <h2 style={{ color: isLight ? '#040F1F' : '#ffffff', marginTop: 16 }}>
              Invalid Booking
            </h2>
            <p style={{ color: isLight ? '#555' : '#a0aec0', marginTop: 8 }}>
              No booking ID was provided.
            </p>
            <button
              onClick={() => router.push('/events')}
              className={styles.ed_book_now_btn}
              style={{ marginTop: 24, padding: '0 32px' }}
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    if (isFreeEvent) {
      return (
        <div className='container mx-auto px-4'>
          <div className={styles.event_details_page}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '60px 20px',
              }}
            >
              <div className='w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin' />
              <p
                style={{
                  color: isLight ? '#555' : '#a0aec0',
                  marginTop: 16,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Loading booking details...
              </p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className='container mx-auto px-4'>
        <div className={styles.event_details_page}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
            {/* Animated Tick */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 52 52"
                style={{ overflow: 'visible' }}
              >
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray="150"
                  strokeDashoffset="150"
                  strokeLinecap="round"
                  style={{
                    animation: 'confirmCircle 0.6s ease forwards',
                  }}
                />
                <path
                  d="M14 27l8 8 16-16"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="50"
                  strokeDashoffset="50"
                  style={{
                    animation: 'confirmTick 0.4s ease forwards 0.5s',
                  }}
                />
              </svg>
            </div>
            <h3
              style={{
                marginTop: 20,
                fontSize: 18,
                fontWeight: 700,
                color: isLight ? '#040F1F' : '#ffffff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Payment Successful!
            </h3>
            <p style={{ color: isLight ? '#555' : '#a0aec0', marginTop: 8, fontSize: 14 }}>
              {/* Loading your booking details... */}
            </p>
            <style>{`
              @keyframes confirmCircle {
                to { stroke-dashoffset: 0; }
              }
              @keyframes confirmTick {
                to { stroke-dashoffset: 0; }
              }
            `}</style>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className='container mx-auto px-4'>
        <div className={styles.event_details_page}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <ErrorOutlineIcon style={{ fontSize: 64, color: '#ef4444' }} />
            <h2 style={{ color: isLight ? '#040F1F' : '#ffffff', marginTop: 16 }}>
              Booking Not Found
            </h2>
            <p style={{ color: isLight ? '#555' : '#a0aec0', marginTop: 8 }}>
              We could not find this booking. It may have expired.
            </p>
            <button
              onClick={() => router.push('/events')}
              className={styles.ed_book_now_btn}
              style={{ marginTop: 24, padding: '0 32px' }}
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>
    )
  }

  const status = getStatusDisplay()
  const paymentStatusStyle = getPaymentStatusStyle(booking.payment?.payment_status || '')
  const bookingStatusStyle = getBookingStatusStyle(booking.booking_status)
  const isFreeBooking =
    isFreeEvent ||
    String(booking.event?.event_type_display || '').toLowerCase() === 'free'
  const provisionalStatus = mapToProvisionalStatus(booking.booking_status)
  const provisionalDisplay = getProvisionalStatusDisplay(provisionalStatus)
  const showProvisionalBanner =
    isSurveyMonkey &&
    (provisionalStatus === 'registration_started' || provisionalStatus === 'conditional_place')

  const bannerUrl = booking.event?.banner_image_url
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
            onClick={() => router.back()}
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

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Status Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 24,
              padding: '16px 20px',
              borderRadius: 16,
              background: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.08)',
              border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.2)'}`,
              ...(showProvisionalBanner && {
                background: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'}`,
              }),
              ...(booking.payment?.payment_status === 'pending' && {
                background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.2)'}`,
              }),
              ...(booking.payment?.payment_status === 'failed' && {
                background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)'}`,
              }),
              ...((booking.payment?.payment_status === 'refunded' || booking.booking_status === 'refunded') && {
                background: isLight ? '#f9fafb' : 'rgba(107, 114, 128, 0.08)',
                border: `1px solid ${isLight ? '#e5e7eb' : 'rgba(107, 114, 128, 0.2)'}`,
              }),
            }}
          >
            {status?.icon}
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: isLight ? '#040F1F' : '#ffffff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {status?.title}
              </h3>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  color: isLight ? '#555' : '#a0aec0',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {status?.subtitle}
              </p>
              {externalRegistrationUrl && isSurveyMonkey && showProvisionalBanner && (
                <a
                  href={externalRegistrationUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: isLight ? '#356FEE' : '#06c1fa',
                    textDecoration: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Open SurveyMonkey form →
                </a>
              )}
              {externalRegistrationUrl &&
                !isSurveyMonkey &&
                booking.booking_status === 'confirmed' &&
                (isFreeEvent || booking.payment?.payment_status === 'completed') && (
                  <a
                    href={externalRegistrationUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: isLight ? '#356FEE' : '#06c1fa',
                      textDecoration: 'none',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    Didn’t see the registration page? Open it here →
                  </a>
                )}
            </div>
          </div>

          {/* Event Card Style Booking Details */}
          <div
            className={styles.ed_payment_card}
            style={{
              background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.5)',
              borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {/* Banner Image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 200,
                overflow: 'hidden',
              }}
            >
              <Image
                src={imageUrl || EventDefaultImage}
                alt={booking.event?.title || 'Event'}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>

            {/* Card Content */}
            <div style={{ padding: '20px' }}>
              {/* Event Title */}
              {booking.event?.title && (
                <h2
                  style={{
                    margin: '0 0 4px',
                    fontSize: 18,
                    fontWeight: 700,
                    color: isLight ? '#040F1F' : '#ffffff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    lineHeight: 1.3,
                  }}
                >
                  {booking.event.title}
                </h2>
              )}

              {/* Date */}
              {booking.event?.start_datetime && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                  }}
                >
                  <CalendarTodayOutlinedIcon
                    style={{ fontSize: 14, color: isLight ? '#555' : '#a0aec0' }}
                  />
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
              <div
                style={{
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`,
                  margin: '0 0 16px',
                }}
              />

              {/* Booking Info Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: 11,
                      color: isLight ? '#888' : '#718096',
                      fontFamily: "'DM Sans', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Booking Number
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: isLight ? '#040F1F' : '#ffffff',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {booking.booking_number}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: 11,
                      color: isLight ? '#888' : '#718096',
                      fontFamily: "'DM Sans', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {isSurveyMonkey ? 'Requested seat' : 'Seats'}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: isLight ? '#040F1F' : '#ffffff',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {booking.num_seats}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`,
                  margin: '0 0 16px',
                }}
              />

              {/* Payment Breakdown */}
              {isFreeBooking ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isLight ? '#040F1F' : '#ffffff',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      Total Amount
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: isLight ? '#356FEE' : '#06c1fa',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Free
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: isLight ? '#555' : '#a0aec0',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Unit Price
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: isLight ? '#040F1F' : '#ffffff',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {'\u00A3'}{booking.unit_price}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: isLight ? '#555' : '#a0aec0',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Subtotal
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: isLight ? '#040F1F' : '#ffffff',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {'\u00A3'}{booking.subtotal}
                    </span>
                  </div>
                  {booking.coupon_code && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: '#22c55e',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Coupon ({booking.coupon_code})
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: '#22c55e',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        - {'\u00A3'}{booking.discount_amount}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 8,
                      borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.15)'}`,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isLight ? '#040F1F' : '#ffffff',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      Total Amount
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: isLight ? '#356FEE' : '#06c1fa',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {'\u00A3'}{booking.total_amount}
                    </span>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div
                style={{
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'}`,
                  margin: '16px 0 0',
                }}
              />

              {/* Booking & Payment Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: isLight ? '#555' : '#a0aec0',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
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
                          : isFreeBooking
                            ? 'rgba(34, 197, 94, 0.15)'
                            : bookingStatusStyle.background,
                      color:
                        isSurveyMonkey
                          ? provisionalDisplay.badgeColor
                          : isFreeBooking
                            ? '#22C55E'
                            : bookingStatusStyle.color,
                      border: isSurveyMonkey
                        ? `1px solid ${provisionalDisplay.badgeColor}`
                        : 'none',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      textTransform: 'capitalize',
                    }}
                  >
                    {isSurveyMonkey
                      ? provisionalDisplay.shortLabel
                      : isFreeBooking
                        ? 'Applied'
                        : bookingStatusStyle.label}
                  </span>
                </div>
                {isFreeBooking ? (
                  (booking.created_at || booking.booked_at) && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: isLight ? '#555' : '#a0aec0',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Applied At
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: isLight ? '#040F1F' : '#ffffff',
                          fontFamily: "'DM Sans', sans-serif",
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <AccessTimeIcon style={{ fontSize: 13 }} />
                        {formatDateTime(booking.created_at || booking.booked_at)}
                      </span>
                    </div>
                  )
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: isLight ? '#555' : '#a0aec0',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
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
                )}
              </div>

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
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={() => router.push('/events')}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 80,
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)'}`,
                background: 'transparent',
                color: isLight ? '#040F1F' : '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Browse Events
            </button>
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
      </div>
    </div>
  )
}
