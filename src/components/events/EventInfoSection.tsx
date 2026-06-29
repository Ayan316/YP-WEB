'use client'

import Image from 'next/image'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'
import CompanyDefauktImage from '../../../public/images/company-logo-default.svg'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Employer {
  id: string
  name: string
  logo_url: string | null
}

interface EventInfoSectionProps {
  event_type_display: string
  pricing_type?: string
  title: string
  start_datetime: string
  end_datetime: string
  employers: Employer[]
  company: { id: string; name: string; logo_url: string | null } | null
  platform_name: string
  platform_link: string
  bookingStatus: string
  timing_info?: string | null
}

const formatDateFull = (dateStr: string) => {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

const formatTimeOnly = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const isSameCalendarDay = (a: string, b: string) => {
  if (!a || !b) return false
  const d1 = new Date(a)
  const d2 = new Date(b)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const EventInfoSection = ({
  event_type_display,
  pricing_type,
  title,
  start_datetime,
  end_datetime,
  employers,
  company,
  platform_name,
  platform_link,
  bookingStatus,
  timing_info
}: EventInfoSectionProps) => {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const allOrganizers: Employer[] = []
  if (company) {
    allOrganizers.push(company as Employer)
  }
  employers.forEach(emp => {
    if (!allOrganizers.find(o => o.id === emp.id)) {
      allOrganizers.push(emp)
    }
  })

  return (
    <div
      className={styles.ed_section_card}
      style={{
        background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.33)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)'
      }}
    >
      <span
        className={styles.ed_event_type_badge}
        style={{ color: isLight ? '#356FEE' : '#06c1fa' }}
      >
        {event_type_display}
      </span>
      <span className={styles.ed_pricing_type_badge}>
        {pricing_type === 'paid' && '   PAID EVENT'}
        {pricing_type === 'free' && '   FREE'}
      </span>

      <h2
        className={styles.ed_event_title}
        style={{ color: isLight ? '#040F1F' : '#ffffff' }}
      >
        {title}
      </h2>
      <div
        className={styles.ed_divider}
        style={{
          borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'
        }}
      />

      {allOrganizers.length > 0 && (
        <div className={styles.ed_organizers_section}>
          <span
            className={styles.ed_organizers_label}
            style={{ color: isLight ? '#888' : '#a0aec0' }}
          >
            Organized by
          </span>
          <div className={styles.ed_organizers_chips}>
            {allOrganizers.map(org => (
              <div
                key={org.id}
                className={styles.ed_organizer_chip}
                style={{
                  background: isLight ? '#f0f4ff' : 'rgba(160, 174, 192, 0.15)',
                  borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
                  cursor: 'pointer'
                }}
                onClick={() => router.push(`/company/${org.id}`)}
              >
                {org.logo_url ? (
                  <Image
                    src={org.logo_url}
                    alt={org.name}
                    width={22}
                    height={22}
                    className={styles.ed_organizer_logo}
                  />
                ) : (
                  <Image
                    src={CompanyDefauktImage}
                    alt={org.name}
                    width={22}
                    height={22}
                    className={styles.ed_organizer_logo}
                  />
                )}
                <span
                  className={styles.ed_organizer_name}
                  style={{ color: isLight ? '#040F1F' : '#ffffff' }}
                >
                  {org.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* {platform_name && (
        <>
          <div
            className={styles.ed_divider}
            style={{
              borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'
            }}
          />
          <div className={styles.ed_meeting_section}>
            <div className={styles.ed_platform_name_chip}>
              <span className={styles.ed_platform_name_chip_icon}>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width={16}
                  height={16}
                  viewBox='0 0 14 14'
                  fill='none'
                >
                  <path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M8.20103 3.27839C6.82122 3.13428 5.43073 3.12353 4.04886 3.24631L3.12603 3.32856C2.75572 3.36177 2.40741 3.51879 2.13731 3.77429C1.86721 4.02978 1.69109 4.36883 1.63736 4.73672C1.41775 6.23762 1.41775 7.76249 1.63736 9.26339C1.69121 9.63133 1.86745 9.9704 2.13765 10.2259C2.40785 10.4814 2.75624 10.6384 3.12661 10.6716L4.04945 10.7532C5.4313 10.8762 6.82179 10.8656 8.20161 10.7217L8.55628 10.6844C8.90833 10.6475 9.23936 10.4989 9.50099 10.2605C9.76263 10.022 9.94117 9.70618 10.0105 9.35906L11.7879 10.3029C11.8518 10.3368 11.923 10.3544 11.9952 10.354C12.0675 10.3537 12.1385 10.3355 12.202 10.301C12.2655 10.2665 12.3195 10.2168 12.3591 10.1564C12.3987 10.0959 12.4227 10.0266 12.429 9.95464L12.4436 9.78897C12.6056 7.93303 12.6056 6.0665 12.4436 4.21056L12.429 4.04489C12.4227 3.97288 12.3986 3.90355 12.3589 3.84313C12.3192 3.7827 12.2652 3.73304 12.2016 3.6986C12.1381 3.66416 12.067 3.64601 11.9947 3.64577C11.9224 3.64553 11.8512 3.66321 11.7874 3.69722L10.0105 4.64106C9.94117 4.29393 9.76263 3.97808 9.50099 3.73964C9.23936 3.5012 8.90833 3.35266 8.55628 3.31572L8.20103 3.27839ZM4.12703 4.11781C5.45238 3.99942 6.78609 4.00977 8.10945 4.14872L8.46411 4.18606C8.6374 4.20441 8.79967 4.27988 8.92534 4.40059C9.05102 4.52131 9.13297 4.6804 9.15828 4.85281C9.36711 6.27672 9.36711 7.72281 9.15828 9.14731C9.13297 9.31972 9.05102 9.47881 8.92534 9.59952C8.79967 9.72023 8.6374 9.79571 8.46411 9.81406L8.10945 9.85139C6.78609 9.99034 5.45238 10.0007 4.12703 9.88231L3.2042 9.79947C3.02979 9.78391 2.8657 9.71007 2.73839 9.58985C2.61108 9.46963 2.52797 9.31004 2.50245 9.13681C2.29511 7.71985 2.29511 6.28026 2.50245 4.86331C2.52775 4.68993 2.61078 4.53015 2.73812 4.40979C2.86546 4.28944 3.02967 4.21555 3.2042 4.20006L4.12703 4.11781ZM10.1249 5.57089C10.2118 6.52172 10.2118 7.47839 10.1249 8.42922L11.6106 9.21847C11.7169 7.74144 11.7169 6.25868 11.6106 4.78164L10.1249 5.57089Z'
                    fill='#3960FB'
                  />
                </svg>
              </span>
              <span className={styles.ed_platform_name_chip_text}>
                {platform_name}
              </span>
              
            </div>
            {platform_link && bookingStatus === 'confirmed' && (
              <div className={styles.ed_platform_link_section}>
                <span className={styles.ed_platform_link_text}>
                  Meeting Link:
                </span>
                <Link
                  href={platform_link}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {platform_link}
                  
                </Link>
              </div>
            )}
          </div>
        </>
      )} */}

      <div
        className={styles.ed_divider}
        style={{
          borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)'
        }}
      />

      <div className={styles.ed_datetime_section}>
        <div className={styles.ed_datetime_header}>
          <CalendarTodayOutlinedIcon
            style={{ fontSize: 18, color: isLight ? '#040F1F' : '#ffffff' }}
          />
          <span
            className={styles.ed_datetime_label}
            style={{ color: isLight ? '#040F1F' : '#ffffff' }}
          >
            Date & Time
          </span>
        </div>

        {isSameCalendarDay(start_datetime, end_datetime) ? (
          <div className={styles.ed_datetime_grid}>
            <div className={styles.ed_datetime_col}>
              <span
                className={styles.ed_datetime_sublabel}
                style={{ color: isLight ? '#888' : '#a0aec0' }}
              >
                Event date
              </span>
              <span
                className={styles.ed_datetime_date}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                {formatDateFull(start_datetime)}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.ed_datetime_grid}>
            <div className={styles.ed_datetime_col}>
              <span
                className={styles.ed_datetime_sublabel}
                style={{ color: isLight ? '#888' : '#a0aec0' }}
              >
                Start
              </span>
              <span
                className={styles.ed_datetime_date}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                {formatDateFull(start_datetime)}
              </span>
            </div>

            <div className={styles.ed_datetime_col}>
              <span
                className={styles.ed_datetime_sublabel}
                style={{ color: isLight ? '#888' : '#a0aec0' }}
              >
                End
              </span>
              <span
                className={styles.ed_datetime_date}
                style={{ color: isLight ? '#040F1F' : '#ffffff' }}
              >
                {formatDateFull(end_datetime)}
              </span>
            </div>
          </div>
        )}
      </div>

      {timing_info && (
        <>
          <div className={styles.ed_datetime_section}>
            <div className={styles.ed_datetime_header}></div>
            <p
              style={{
                color: isLight ? '#555' : '#a0aec0',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'pre-line'
              }}
            >
              {timing_info}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default EventInfoSection
