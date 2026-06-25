import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import Header from '@/components/commonUI/Header'
import PrivacyPolicyContent from '@/components/legal/PrivacyPolicyContent'
import styles from '../../_assets/style/style.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy | Young Pro',
  description:
    'How Young Pro collects, uses, shares and protects your personal information.',
}

export default function PrivacyPolicyPage() {
  // /privacy-policy is a public route, so the global Providers intentionally
  // skip SessionProvider here (see SessionBoundary in Providers.tsx). The
  // Header relies on useSession, so wrap this page in its own SessionProvider.
  return (
    <SessionProvider>
      <div className={styles.layout_main_section_wrapper}>
        <Header />
        <main className={styles.layout_main_content}>
          <PrivacyPolicyContent />
        </main>
      </div>
    </SessionProvider>
  )
}
