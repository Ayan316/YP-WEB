import { Suspense } from 'react'
import BookingDetailLayout from '@/components/events/BookingDetailLayout'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <Suspense>
      <BookingDetailLayout bookingId={decodedId} />
    </Suspense>
  )
}
