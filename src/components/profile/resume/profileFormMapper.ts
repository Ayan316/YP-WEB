// ───────────────────────────────────────────────────────────────────────────
// Resume upload — profile-update payload mapping
//
// The backend's update-profile endpoint is a full replace, so every mutation
// must ride along with the user's existing fields. buildProfilePreservePayload
// is the canonical "preserve everything else" helper used across the app; we
// reuse it here and then attach the resume.
//
//  - Upload/replace → multipart FormData with the `resume` File appended.
//  - Remove         → plain JSON with `resume: null`.
// ───────────────────────────────────────────────────────────────────────────

import { buildProfilePreservePayload } from "@/services/profile.services";

/** Loose shape of the profile object — we only read the resume fields. */
export interface ProfileLike {
  resume_url?: string | null;
  resume?: string | null;
  [key: string]: unknown;
}

/**
 * Build a multipart FormData for a profile update that includes the resume.
 * Existing profile fields are appended as strings; `resume` is the File.
 */
export function buildResumeUploadFormData(
  user: ProfileLike,
  resume: File,
): FormData {
  const base = buildProfilePreservePayload(user);
  const formData = new FormData();

  for (const [key, value] of Object.entries(base)) {
    if (value === undefined || value === null) continue;
    formData.append(key, String(value));
  }

  formData.append("resume", resume);
  return formData;
}

/**
 * Build the JSON payload for removing the resume. Preserves all other fields
 * and sends `resume: null` so the backend clears it.
 */
export function buildResumeRemovePayload(
  user: ProfileLike,
): Record<string, unknown> {
  return buildProfilePreservePayload(user, { resume: null });
}
