"use server";

// Gated profile Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   profile-data         → profile           (own-profile read)
//   update-profile       → update-profile     (JSON or multipart full-replace)
//   upload-profile-image → V1/upload-profile-img  (always multipart)
//
// Each returns the unchanged `{ status, code?, message?, data }` envelope; a
// logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit) which the
// client maps to its login gate (never force-logout). The profile screen is an
// interactive client TanStack query (useUserProfile / useUpdateProfile), so
// these keep their existing query invalidation and are NOT revalidated here.
//
// MULTIPART: upload-profile-image is ALWAYS FormData and update-profile is
// CONDITIONALLY FormData (resume upload) — both forward via api.postForm so the
// multipart boundary is preserved (do NOT JSON-stringify a FormData body).

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

// The backend profile bodies are dynamic at the call sites (useUserProfile
// reads `res.data`, useUpdateProfile reads `data.data`); `data` is `any` to
// preserve the original axios pass-through ergonomics — same documented
// exception as src/app/actions/feed.ts.

/** POST /api/mobile/profile — the logged-in user's own profile. */
export async function getUserProfileAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.profileData, undefined, { auth: "strict" });
}

/**
 * POST /api/mobile/update-profile — full-replace profile update.
 *
 * The backend treats POST as a full replace, so callers send a preserve-payload
 * (buildProfilePreservePayload) with all fields. Accepts either a plain object
 * (JSON) or FormData (when a resume file is included) — FormData is forwarded
 * via api.postForm to keep the multipart boundary.
 */
export async function updateUserProfileAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: FormData | Record<string, any>,
) {
  if (payload instanceof FormData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return api.postForm<any>(EP.updateProfile, payload, { auth: "strict" });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.updateProfile, payload, { auth: "strict" });
}

/**
 * POST /api/mobile/V1/upload-profile-img — upload (or clear) the profile photo.
 *
 * Always multipart: the caller builds a FormData with a `profile_image` File
 * (or an empty value to remove). Forwarded via api.postForm so the boundary is
 * set correctly (MUST NOT be JSON-stringified).
 */
export async function uploadProfileImageAction(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.postForm<any>(EP.uploadProfileImg, formData, { auth: "strict" });
}
