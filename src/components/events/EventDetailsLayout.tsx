'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { useQuery } from '@tanstack/react-query'
import { getEventDetails } from '@/services/events.services'
import { ensureValidToken } from '@/lib/tokenManager'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EventDetailsCoverImage from './EventDetailsCoverImage'
import EventInfoSection from './EventInfoSection'
import EventDescriptionSection from './EventDescriptionSection'
import EventKeywordSection from './EventKeywordSection'
import EventLocationSection from './EventLocationSection'
import EventPaymentSection from './EventPaymentSection'
import EventFreePaymentSection from './EventFreePaymentSection'
import EventDetailsSkeleton from '../commonUI/loaders/skeletons/EventDetailsSkeleton'
import styles from '@/moduleCss/events.module.css'

type Props = {
  eventId: string
}

export default function EventDetailsLayout({ eventId }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const {
    data: eventResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: async () => {
      await ensureValidToken()
      return getEventDetails({ id: eventId })
    },
    enabled: !!eventId,
  })

  const event = eventResponse?.data

  const isFree = event?.pricing_type === 'free'

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
            Event Details
          </h1>
        </div>

        {/* Loading State */}
        {isLoading && <EventDetailsSkeleton />}

        {/* Error State */}
        {(isError || (!isLoading && !event)) && (
          <div className={styles.event_details_error}>
            <p style={{ color: isLight ? '#555' : '#a0aec0' }}>
              {isError ? 'Failed to load event details.' : 'Event not found.'}
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
        {event && (
          <>
            {/* Cover Image */}
            <EventDetailsCoverImage
              banner_image_url={event.banner_image_url}
              sidebar_image_url={event.sidebar_image_url ?? null}
              gallery_images={event.gallery_images ?? []}
              title={event.title}
            />

            {/* Two Column Layout */}
            <div className={styles.event_details_content}>
              {/* Left Column - Event Info Sections */}
              <div className={styles.event_details_main}>
                <EventInfoSection
                  event_type_display={event.event_type_display}
                  pricing_type={event.pricing_type}
                  title={event.title}
                  start_datetime={event.start_datetime}
                  end_datetime={event.end_datetime}
                  employers={event.employers || []}
                  company={event.company || null}
                  platform_name={event.platform_name}
                  platform_link={event.platform_link}
                  bookingStatus={event?.user_booking?.booking_status}
                  timing_info={event.timing_info}
                />

                {event.description && (
                  <EventDescriptionSection description={event.description} />
                )}

                <EventKeywordSection keywords={event.keywords || []} />

                <EventLocationSection
                  event_type={event.event_type}
                  location={event.location}
                  platform_name={event.platform_name}
                  platform_link={event.platform_link}
                />
              </div>

              {/* Right Column - Payment Section */}
              <div className={styles.event_details_sidebar}>
                {isFree ? (
                  <EventFreePaymentSection
                    eventId={eventId}
                    external_registration_url={event.external_registration_url ?? null}
                    is_registration_open={event.is_registration_open}
                    availability_status={event.availability_status}
                    user_booking={event.user_booking || null}
                  />
                ) : (
                  <EventPaymentSection
                    eventId={eventId}
                    list_price={event.list_price}
                    offer_price={event.offer_price}
                    min_seats_per_booking={event.min_seats_per_booking || 1}
                    max_seats_per_booking={event.max_seats_per_booking || 10}
                    seats_available={event.seats_available ?? null}
                    availability_status={event.availability_status || 'available'}
                    user_booking={event.user_booking || null}
                    available_coupons={event.available_coupons || []}
                    external_registration_url={event.external_registration_url ?? null}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
