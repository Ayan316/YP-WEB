import ResourceDetailLayout from '@/components/resources/ResourceDetailLayout'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return <ResourceDetailLayout id={decodedId} />
}
