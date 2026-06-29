import { Suspense } from 'react'
import ResourceListing from '@/components/resources/ResourceListing'

export default function Page() {
  return (
    <Suspense>
      <ResourceListing />
    </Suspense>
  )
}
