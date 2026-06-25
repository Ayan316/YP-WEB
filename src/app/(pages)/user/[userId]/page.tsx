"use client";

import { Suspense } from "react";
import UserProfilePage from "@/components/userInfo/UserInfo";
import { GlobalSpinner } from "@/components/commonUI/loaders/spinners/GlobalSpinner";
export default function Page() {
  return (
    <Suspense fallback={<div className="text-white flex items-center justify-center min-h-[80vh] w-full">
      <GlobalSpinner />
      </div>}>
      <UserProfilePage />
    </Suspense>
  );
}
