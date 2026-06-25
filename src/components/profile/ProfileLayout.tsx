// components/profile/ProfileLayout.tsx
import styles from "../../moduleCss/profile.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Props = {
  topLeft: React.ReactNode;
  topRight: React.ReactNode;
  bottomLeft: React.ReactNode;
  bottomRight: React.ReactNode;
  down?: React.ReactNode;
  title?: string;

  actionButtons?: React.ReactNode;
};

export default function ProfileLayout({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  down,
  title = "My Profile",
  actionButtons,
}: Props) {
  const router = useRouter();

  return (
    <main className={styles.profileLayout}>
      <div className="container mx-auto px-4">
        <div className={styles.pageHeader}>
          <div className={styles.top_area}>
            <div className="flex items-center gap-2">
              <button
              className="backbtn-page cursor-pointer"
              // onClick={() => router.push(backRoute)}
              onClick={() => router.back()}
              type="button"
            >
              <span>
                <Image
                  src="/profile/backbtn_icon.svg"
                  alt="Back"
                  width={24}
                  height={24}
                />
              </span>
              
              </button>
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
            {actionButtons && <div className="flex gap-2">{actionButtons}</div>}
          </div>
        </div>
        <div className={styles.profileGrid}>
          <div className={`${styles.gridCell} ${styles.topLeftCell}`}>
            {topLeft}
          </div>
          <div className={`${styles.gridCell} ${styles.topRightCell}`}>
            {topRight}
          </div>
          <div className={`${styles.gridCell} ${styles.bottomLeftCell}`}>
            {bottomLeft}
          </div>
          <div className={`${styles.gridCell} ${styles.bottomRightCell}`}>
            {bottomRight}
          </div>
        </div>
        <div>{down}</div>
      </div>
    </main>
  );
}