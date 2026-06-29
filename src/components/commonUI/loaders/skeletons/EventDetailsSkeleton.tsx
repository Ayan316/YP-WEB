import { Skeleton } from "@/components/ui/skeleton"
import styles from "@/moduleCss/events.module.css"

export default function EventDetailsSkeleton() {
  return (
    <>
      {/* Cover Image */}
      <div className={styles.event_details_cover_wrapper}>
        <Skeleton className="h-full w-full" />
      </div>

      {/* Two Column Layout */}
      <div className={styles.event_details_content}>
        {/* Left Column */}
        <div className={styles.event_details_main}>
          {/* Info Section */}
          <div className={styles.ed_section_card}>
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-7 w-3/4 mb-4" />
            <Skeleton className="h-px w-full mb-4" />
            <Skeleton className="h-4 w-20 mb-3" />
            <div style={{ display: 'flex', gap: 48 }}>
              <div>
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-px w-full my-4" />
            <Skeleton className="h-3 w-20 mb-3" />
            <div style={{ display: 'flex', gap: 10 }}>
              <Skeleton className="h-9 w-32" style={{ borderRadius: 5 }} />
              <Skeleton className="h-9 w-32" style={{ borderRadius: 5 }} />
            </div>
          </div>

          {/* Description Section */}
          <div className={styles.ed_section_card}>
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Keywords Section */}
          <div className={styles.ed_section_card}>
            <Skeleton className="h-5 w-24 mb-3" />
            <div style={{ display: 'flex', gap: 10 }}>
              <Skeleton className="h-8 w-20" style={{ borderRadius: 24 }} />
              <Skeleton className="h-8 w-16" style={{ borderRadius: 24 }} />
              <Skeleton className="h-8 w-24" style={{ borderRadius: 24 }} />
            </div>
          </div>

          {/* Location Section */}
          <div className={styles.ed_section_card}>
            <Skeleton className="h-5 w-24 mb-3" />
            <Skeleton className="h-4 w-64 mb-3" />
            <Skeleton className="h-[250px] w-full" style={{ borderRadius: 12 }} />
          </div>
        </div>

        {/* Right Column - Payment */}
        <div className={styles.event_details_sidebar}>
          <div className={styles.ed_payment_card}>
            <Skeleton className="h-[72px] w-full mb-3" style={{ borderRadius: 16 }} />
            <Skeleton className="h-[180px] w-full mb-3" style={{ borderRadius: 12 }} />
            <Skeleton className="h-10 w-full" style={{ borderRadius: 80 }} />
          </div>
        </div>
      </div>
    </>
  )
}