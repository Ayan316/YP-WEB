
import OtpVerificationPage from "@/components/authentication/VerifyClient";
import { GlobalSpinner } from "@/components/commonUI/loaders/spinners/GlobalSpinner";
import React, { Suspense } from "react";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><GlobalSpinner /></div>}>
      {/* The client component will hydrate on the client */}
      <OtpVerificationPage />
    </Suspense>
  );
}