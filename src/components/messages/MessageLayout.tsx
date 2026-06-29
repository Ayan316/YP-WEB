'use client'

import styles from "../../moduleCss/messages.module.css";
import { useTheme } from "@/context/ThemeContext";

export default function MessageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  return (
    <div className="container mx-auto px-4">
      <div
        className={`${styles.message_main_section_wrapper} mt-6 max-content-height`}
      >
        <div className={`${styles.message_main_section_title}`}>
          <h2 className={`${styles.message_main_section_title_text}`} style={isLight ? { color: '#040F1F' } : {}}>
            Messages
          </h2>
          </div>
        <div className="row gap-y-4">{children}</div>
      </div>
    </div>
  );
}
