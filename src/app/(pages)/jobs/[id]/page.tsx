import JobDetails from "@/components/jobs/JobDetails";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;
  
  // Decode the URL-encoded ID
  const decodedId = decodeURIComponent(id);
  
  console.log("Encoded ID:", id);
  console.log("Decoded ID:", decodedId);
  
  return <JobDetails jobId={decodedId} />;
}