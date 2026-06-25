import type { Metadata } from 'next'
import TermsContent from '@/components/legal/TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Use | Young Pro',
  description:
    'Terms of Use governing access to and use of the Young Professionals Global platform.',
}

export default function TermsOfUsePage() {
  return <TermsContent />
}
