import { Suspense } from "react";
import JobListing from "@/components/jobs/JobListing";
import { GlobalSpinner } from "@/components/commonUI/loaders/spinners/GlobalSpinner";


export default function Page() {
  return (
    <Suspense>
      <JobListing />
    </Suspense>
  );
}
