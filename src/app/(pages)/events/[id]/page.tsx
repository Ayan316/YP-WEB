import EventDetailsLayout from "@/components/events/EventDetailsLayout";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  return <EventDetailsLayout eventId={decodedId} />;
}
