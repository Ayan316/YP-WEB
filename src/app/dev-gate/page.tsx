import { Suspense } from "react";
import DevGateForm from "./DevGateForm";

// Standalone access gate for dev/staging. Rendered by the proxy redirect when
// the dev_gate cookie is missing/invalid. DevGateForm reads useSearchParams
// (callbackUrl), so it must sit inside a Suspense boundary for prerender.
export default function DevGatePage() {
  return (
    <Suspense fallback={null}>
      <DevGateForm />
    </Suspense>
  );
}
