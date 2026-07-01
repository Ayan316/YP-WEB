import { Suspense } from 'react'
import MessagesClient from '@/components/messages/MessageClient'
import MessageLayoutSkeleton from '@/components/commonUI/loaders/skeletons/MessagePageSkeleton'

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessageLayoutSkeleton />}>
      <MessagesClient />
    </Suspense>
  )
}
