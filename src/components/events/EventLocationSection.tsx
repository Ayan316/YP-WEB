'use client'

import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import styles from '@/moduleCss/events.module.css'
import { useTheme } from '@/context/ThemeContext'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

interface EventLocationSectionProps {
  event_type: string
  location: string[] | { city?: string; venue?: string } | null
  platform_name: string | null
  platform_link: string | null
}

const EventLocationSection = ({
  event_type,
  location,
  platform_name,
  platform_link,
}: EventLocationSectionProps) => {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  // Don't show location section for online/virtual events (event_type "1" = virtual)
  if (event_type === '1' || event_type === 'virtual') return null

  let fullAddress = ''
  if (Array.isArray(location)) {
    fullAddress = location.filter(Boolean).join(', ')
  } else if (location && typeof location === 'object') {
    fullAddress = [location.venue, location.city].filter(Boolean).join(', ')
  }

  if (!fullAddress) return null

  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(fullAddress)}&zoom=15`

  return (
    <div
      className={styles.ed_section_card}
      style={{
        background: isLight ? '#ffffff' : 'rgba(2, 12, 25, 0.33)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.3)',
      }}
    >
      <div className={styles.ed_location_header}>
        <LocationOnOutlinedIcon
          style={{ fontSize: 20, color: isLight ? '#040F1F' : '#ffffff' }}
        />
        <h3
          className={styles.ed_section_heading}
          style={{ color: isLight ? '#040F1F' : '#ffffff', margin: 0 }}
        >
          Location
        </h3>
      </div>

      <p
        className={styles.ed_location_address}
        style={{ color: isLight ? '#888' : '#a0aec0' }}
      >
        {fullAddress}
      </p>

      {/* Google Maps Embed */}
      <div
        className={styles.ed_map_container}
        style={{
          borderColor: isLight ? '#e2e8f0' : 'rgba(160, 174, 192, 0.2)',
        }}
      >
        <iframe
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${fullAddress}`}
        />
      </div>
    </div>
  )
}

export default EventLocationSection
