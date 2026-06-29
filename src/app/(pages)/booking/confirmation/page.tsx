import { Suspense } from 'react'
import BookingConfirmation from '@/components/events/BookingConfirmation'

export default function Page() {
  return (
    <Suspense>
      <BookingConfirmation />
    </Suspense>
  )
}
