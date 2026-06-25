// app/page.tsx (Server Component)
import { Suspense } from "react";
import AuthWrapper from "@/components/authentication/AuthWrapper";
import { GlobalSpinner } from "@/components/commonUI/loaders/spinners/GlobalSpinner";

const Page = () => {
  // AuthWrapper's child components read `useSearchParams` (to preserve the
  // callbackUrl from email deep links). Next.js requires that to sit inside
  // a Suspense boundary during prerender, otherwise the /auth build bails.
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-screen'>
          <GlobalSpinner />
        </div>
      }
    >
      <AuthWrapper />
    </Suspense>
  );
}

export default Page;