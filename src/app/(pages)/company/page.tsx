import CompaniesList from "@/components/company/CompaniesList";
import { Suspense } from "react";

export default function CompanyPage() {
  return (
    <Suspense>
      <CompaniesList />
    </Suspense>
  );
}
