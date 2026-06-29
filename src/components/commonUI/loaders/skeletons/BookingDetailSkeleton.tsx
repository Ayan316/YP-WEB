import { Skeleton } from "@/components/ui/skeleton"
import styles from "@/moduleCss/events.module.css"

export default function BookingDetailSkeleton() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div
        className={styles.ed_payment_card}
        style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}
      >
        {/* Banner */}
        <Skeleton className="w-full" style={{ height: 220 }} />

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Title */}
          <Skeleton className="h-6 w-3/4 mb-2" />
          {/* Date */}
          <Skeleton className="h-4 w-48 mb-5" />
          {/* Divider */}
          <Skeleton className="h-px w-full mb-4" />
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-8" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          {/* Divider */}
          <Skeleton className="h-px w-full mb-4" />
          {/* Payment summary */}
          <Skeleton className="h-4 w-32 mb-3" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-px w-full my-1" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Skeleton className="flex-1 h-11" style={{ borderRadius: 80 }} />
        <Skeleton className="flex-1 h-11" style={{ borderRadius: 80 }} />
      </div>
    </div>
  )
}