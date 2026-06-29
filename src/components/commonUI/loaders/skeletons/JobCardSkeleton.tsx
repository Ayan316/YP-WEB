import { Skeleton } from "@/components/ui/skeleton";
import styles from "@/moduleCss/jobs.module.css";

export default function JobCardSkeleton() {
  return (
    <div className={`${styles.jobListing_job_list} mb-2`}>
          <div className={`${styles.jobListing_job_item}`} style={{ pointerEvents: 'none' }}>
            <div className={styles.jobListing_job_item_main}>
              <div className={styles.jobListing_job_item_logo}>
                <Skeleton className="h-20 w-20 mb-2" />
              </div>

              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-24 mb-2" />
              </div>

              <div className={styles.jobListing_job_item_btns}>
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-6 w-20 mb-2" />
              </div>
            </div>
          </div>
    </div>
  );
}
