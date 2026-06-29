import { Skeleton } from "@/components/ui/skeleton"
import styles from "@/moduleCss/resources.module.css"

export default function ResourceDetailsSkeleton() {
  return (
    <>
      {/* Top zone: header card + side box */}
      <div className={styles.top_zone}>
        {/* Header card (cover + title + meta) */}
        <div className={styles.detail_head}>
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-7 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-[320px] w-full" style={{ borderRadius: 16 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Skeleton className="h-7 w-28" style={{ borderRadius: 20 }} />
            <Skeleton className="h-7 w-24" style={{ borderRadius: 20 }} />
            <Skeleton className="h-7 w-32" style={{ borderRadius: 20 }} />
          </div>
        </div>

        {/* Side box (Details) */}
        <div className={styles.detail_side}>
          <div className={styles.side_box}>
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.detail_main}>
        <Skeleton className="h-5 w-full mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </>
  )
}
