"use client";

import type { Metadata } from "next";
import { usePathname } from "next/navigation";
import Header from "@/components/commonUI/Header";
import styles from "../../_assets/style/style.module.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideHeaderRoutes = ["/onboarding", "/help-and-support"];

  const hideHeader = hideHeaderRoutes.includes(pathname);

  return (
    <div className={styles.layout_main_section_wrapper}>
      {/* Header */}
      {!hideHeader && <Header />}

      {/* Main Content */}
      <main className={styles.layout_main_content}>{children}</main>
    </div>
  );
}
