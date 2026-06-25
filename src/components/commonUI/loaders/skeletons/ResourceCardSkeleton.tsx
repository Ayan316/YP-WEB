import { Skeleton } from '@/components/ui/skeleton'
import styles from '@/moduleCss/resources.module.css'

export default function ResourceCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.r_grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.r_card} style={{ cursor: 'default' }}>
          {/* Media */}
          <div className={styles.r_media}>
            <Skeleton className="h-full w-full" />
          </div>

          {/* Body */}
          <div className={styles.r_body}>
            {/* Category chip */}
            <Skeleton className="h-5 w-24" style={{ borderRadius: 20 }} />

            {/* Title (2 lines) */}
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />

            {/* Excerpt (3 lines) */}
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
