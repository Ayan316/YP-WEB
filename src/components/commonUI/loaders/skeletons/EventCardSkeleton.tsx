import { Skeleton } from "@/components/ui/skeleton"
import styles from "@/moduleCss/events.module.css"

export default function EventCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.event_cards_grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.event_card} style={{ cursor: 'default' }}>
          {/* Image */}
          <div className={styles.event_card_image_wrapper}>
            <Skeleton className="h-full w-full" style={{ borderRadius: 16 }} />
          </div>

          {/* Content */}
          <div className={styles.event_card_content}>
            {/* Badge */}
            <div className={styles.event_card_badge_price_row}>
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Title */}
            <Skeleton className="h-5 w-full mb-1" />

            {/* Date */}
            <div className={styles.event_card_date_row}>
              <Skeleton className="h-3 w-48" />
            </div>

            {/* Price + Button */}
            <div className={styles.event_card_price_btn_row}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-[140px]" style={{ borderRadius: 80 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}