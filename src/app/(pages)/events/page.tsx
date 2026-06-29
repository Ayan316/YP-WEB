import { Suspense } from 'react'
import EventListing from '@/components/events/EventListing'

export default function Page() {
  return (
    <Suspense >
      <EventListing />
    </Suspense>
  )
}