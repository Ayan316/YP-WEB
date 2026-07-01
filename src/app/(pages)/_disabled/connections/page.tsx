import { GlobalSpinner } from "@/components/commonUI/loaders/spinners/GlobalSpinner";
import ConnectionList from "@/components/connections/ConnectionList";
import ConnectionCardSkeleton from "@/components/commonUI/loaders/skeletons/ConnectionPageSkeleton";
import { Suspense } from "react";

export default function Connections() {
  return (    
    <Suspense
      fallback={
          <ConnectionCardSkeleton />
      }
    >
      <ConnectionList />
    </Suspense>
  );
}
