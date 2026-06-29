"use server";

// Gated terms Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes user/accept-terms + user/terms-status.
// Neither had a client service wrapper or component caller (the social-login
// flow in src/auth.ts accepts terms server-side against the backend directly),
// so these are provided for parity / future client use. Each returns the
// unchanged `{ status, code?, message?, data }` envelope; a logged-out caller
// gets `code:"UNAUTHENTICATED"` (no network hit).

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

// Backend bodies are dynamic; `data` is `any` to preserve pass-through
// ergonomics (same documented exception as src/app/actions/feed.ts).

/** POST /api/mobile/user/accept-terms — record that the user accepted terms. */
export async function acceptTermsAction(payload: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.acceptTerms, payload, { auth: "strict" });
}

/** POST /api/mobile/user/terms-status — whether the user accepted terms. */
export async function fetchTermsStatusAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.termsStatus, {}, { auth: "strict" });
}
