import CompanyDetails from "@/components/company/CompanyDetailsLayout";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompanyDetailsPage({ params }: Props) {
  const { id } = await params;
  
  // Decode the URL-encoded ID
  const decodedId = decodeURIComponent(id);
  
  // console.log("Encoded ID:", id);
  // console.log("Decoded ID:", decodedId);
  
  return <CompanyDetails companyId={decodedId} />;
}