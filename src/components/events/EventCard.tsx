'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'
import EventDefaultImage from '../../../public/images/DummyEvent.svg'
import { InitialAvatar } from '../commonUI/InitialAvatar'
import {
  isSurveyMonkeyEvent,
  mapToProvisionalStatus,
  getProvisionalStatusDisplay,
} from '@/types/eventStatus'

interface EventCardProps {
  id: string
  banner_image_url: string
  title: string
  start_datetime: string
  end_datetime: string
  location: string | null
  platform_name: string | null
  offer_price: string | null
  list_price: string
  event_type_display: string
  pricing_type?: string
  availability_status?: string
  bookingId?: string
  bookingStatus?: string
  numSeats?: number
  is_booked?: boolean
  bookingNumber?: string
  sidebar_image_url?: string
  external_registration_url?: string | null
  onBeforeNavigate?: () => void
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  return `${day}, ${month} ${year}`
}

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const formatTime = (startStr: string, endStr: string) => {
  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  return `${fmt(startStr)} to ${fmt(endStr)}`
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

const EventCard = ({
  id,
  banner_image_url,
  sidebar_image_url,
  title,
  start_datetime,
  end_datetime,
  location,
  platform_name,
  offer_price,
  list_price,
  event_type_display,
  pricing_type,
  availability_status,
  bookingId,
  bookingStatus,
  numSeats,
  is_booked,
  bookingNumber,
  external_registration_url,
  onBeforeNavigate,
}: EventCardProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const router = useRouter()
  const isSurveyMonkey = isSurveyMonkeyEvent({
    external_registration_url,
    pricing_type,
    event_type_display,
  })

  const displayPrice = offer_price ? parseFloat(offer_price) : parseFloat(list_price)
  const originalPrice = offer_price ? parseFloat(list_price) : null
  const isFree = pricing_type === 'free' || (!bookingId && displayPrice === 0)
  const displayLocation = location || platform_name || 'Online'

  const rawImageUrl = sidebar_image_url
    ? sidebar_image_url.startsWith('http')
      ? sidebar_image_url
      : `${process.env.NEXT_PUBLIC_STORAGE_URL || ''}${sidebar_image_url}`
    : null

  let imageUrl: string | null = null
  if (rawImageUrl) {
    try {
      new URL(rawImageUrl)
      imageUrl = rawImageUrl
    } catch {
      imageUrl = null
    }
  }

  const handleCardClick = () => {
    onBeforeNavigate?.()
    if (bookingId) {
      router.push(`/booking/${bookingId}`)
    } else {
      router.push(`/events/${id}`)
    }
  }

  return (
    <div className={styles.event_card} onClick={handleCardClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <div className={styles.event_card_image_wrapper}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className={styles.event_card_image}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <InitialAvatar
            name={title}
            size={155}
            borderRadius={16}
            textScale={0.36}
            style={{ width: '100%', height: '100%', borderRadius: 16 }}
          />
        )}
      </div>
      <div className={styles.event_card_content}>
        <div className={styles.event_card_badge_price_row}>
          <span className={styles.event_card_badge}>{event_type_display}</span>
          
          <div className='flex gap-2 align-center justify-end'>
            
          {availability_status === 'sold_out' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                textTransform: 'capitalize',
                letterSpacing: 0.5,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid #EF4444',
              }}
            >
              Sold Out
            </span>
          )}
          {availability_status === 'registration_closed' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                textTransform: 'capitalize',
                letterSpacing: 0.5,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid #EF4444',
              }}
            >
              Registration Closed
            </span>
          )}
          {is_booked && !bookingId && !bookingStatus && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                textTransform: 'capitalize',
                letterSpacing: 0.5,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22C55E',
                border: '1px solid #22C55E',
              }}
            >
              {pricing_type === 'free' ? 'Applied' : 'Booked'}
            </span>
          )}
          </div>
          {bookingStatus && (() => {
            if (isSurveyMonkey) {
              const provisional = mapToProvisionalStatus(bookingStatus)
              const display = getProvisionalStatusDisplay(provisional)
              // My Bookings list shows "Registration Started" instead of
              // "Conditional place" — clearer that the user still needs to
              // complete the Survey form.
              const cardLabel =
                provisional === 'conditional_place'
                  ? 'Registration Started'
                  : display.shortLabel
              return (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    textTransform: 'capitalize',
                    letterSpacing: 0.5,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    background: display.badgeBackground,
                    color: display.badgeColor,
                    border: `1px solid ${display.badgeColor}`,
                  }}
                >
                  {cardLabel}
                </span>
              )
            }
            return (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  textTransform: 'capitalize',
                  letterSpacing: 0.5,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  ...(bookingStatus === 'confirmed'
                    ? { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid #22C55E' }
                    : bookingStatus === 'pending'
                    ? { background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', border: '1px solid #EAB308' }
                    : bookingStatus === 'cancelled'
                    ? { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid #EF4444' }
                    : bookingStatus === 'refunded'
                    ? { background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', border: '1px solid #8B5CF6' }
                    : { background: 'rgba(107, 114, 128, 0.15)', color: '#6B7280', border: '1px solid #6B7280' }),
                }}
              >
                {bookingStatus === 'confirmed'
                  ? pricing_type === 'free'
                    ? 'Confirmed'
                    : 'Booked'
                  : bookingStatus === 'pending'
                    ? pricing_type === 'free'
                      ? 'Registration Started'
                      : 'Pending'
                    : bookingStatus === 'cancelled'
                      ? 'Not Selected'
                      : bookingStatus}
              </span>
            )
          })()}
        </div>
        <h3 className={styles.event_card_title}>{title}</h3>
        <div className={styles.event_card_date_row}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isLight ? '#555555' : '#a0aec0'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={styles.event_card_date_text}>
            {bookingId
              ? formatShortDate(start_datetime)
              : isSameCalendarDay(start_datetime, end_datetime)
                ? formatDate(start_datetime)
                : `${formatDate(start_datetime)} - ${formatDate(end_datetime)}`}
          </span>
          {bookingId && numSeats && (
            <>
              <span style={{ color: isLight ? '#d1d5db' : '#4a5568', margin: '0 4px' }}>&bull;</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLight ? '#555555' : '#a0aec0'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className={styles.event_card_date_text}>
                {numSeats} {numSeats > 1 ? 'Seats' : 'Seat'}
              </span>
            </>
          )}
          {bookingId && bookingNumber && (
            <>
              <span style={{ color: isLight ? '#d1d5db' : '#4a5568', margin: '0 4px' }}>&bull;</span>
              <span
                className={styles.event_card_date_text}
                style={{
                  color: isLight ? '#555555' : '#a0aec0',
                  fontWeight: 500,
                }}
              >
                {bookingNumber}
              </span>
            </>
          )}
        </div>
        <div className={styles.event_card_price_btn_row}>
          <div className={styles.event_card_price_wrapper}>
            <span className={styles.event_card_price}>
              {isFree ? 'FREE' : `£${displayPrice.toFixed(2)}`}
            </span>
            {originalPrice !== null && !isFree && (
              <span className={styles.event_card_original_price}>
                £{originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <button
            className={styles.event_card_btn}
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventCard;
