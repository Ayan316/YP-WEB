// Migrated to Server Actions (no longer axios):
//   - getConnectionUserProfile  → users.ts (PUBLIC get-user, soft auth)
//   - getUserProfile / updateUserProfile / uploadProfileImage → profile.ts (strict)
// The remaining functions (createProfile, checkPhoneAvailability) are keep-list
// onboarding routes and call their same-origin route with plain fetch now that
// the client axios transport is retired (REQUIREMENTS §10 Phase 4).
import { getConnectionUserProfileAction } from "@/app/actions/users";
import {
  getUserProfileAction,
  updateUserProfileAction,
  uploadProfileImageAction,
} from "@/app/actions/profile";
import { UnauthenticatedError } from "@/lib/authError";

// ---------------------------------------------------------------------------
// Profile request types
// ---------------------------------------------------------------------------
// The create/update endpoints accept multipart FormData. The interface below
// documents the keys we send (or may send) per the career_status branch:
//
//  - career_status is ALWAYS required.
//  - Branch A (formal education): place_of_study, education, degree,
//    start_year, end_year are required. current_situation is omitted.
//  - Branch B (contextual): current_situation is required. The education
//    fields are optional and must be omitted (NOT sent as empty strings)
//    when the user did not fill them in.
export interface CreateProfileRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  location: string;
  dob?: string;
  gender: string;
  career_status: string;
  current_situation?: string;
  place_of_study?: string;
  education?: string;
  degree?: string;
  start_year?: string;
  end_year?: string;
  skills?: string;
  additional_skills?: string;
  profile_image?: File | Blob;
}

export type UpdateProfileRequest = Partial<CreateProfileRequest> & {
  full_name?: string;
  role?: string;
};

export async function createProfile(payload: FormData) {
  // Same-origin keep-list route (POST /api/create-profile). The payload is
  // multipart FormData — do NOT set Content-Type so the browser adds the
  // boundary. The session cookie is forwarded so the route attaches the Bearer.
  try {
    const res = await fetch("/api/create-profile", {
      method: "POST",
      credentials: "include",
      body: payload,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      throw new Error(body?.message || "Profile creation failed!");
    }

    return body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Create profile ERROR:", error);
    throw new Error(error?.message || "Profile creation failed!");
  }
}



export const uploadProfileImage = async (formData: FormData) => {
  // Migrated to a strict Server Action (multipart via api.postForm — the
  // FormData is forwarded as-is so the boundary is preserved). The callers
  // (ProfileImageCard) only branch on success/throw, so we return the verbatim
  // backend body on success and throw on error / UNAUTHENTICATED.
  const res = await uploadProfileImageAction(formData);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Profile image upload failed");
  }
  return res.data;
};

export async function getUserProfile() {
  // Migrated to a strict Server Action. The action's `data` is the verbatim
  // backend profile body the old proxy returned, so call sites (useUserProfile)
  // that read `res.data` are unchanged.
  const res = await getUserProfileAction();
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch profile");
  }
  return res.data;
}

// The backend's /api/mobile/update-profile treats POST as a full replace —
// any field that's missing from the body is reset to its default. Use this
// helper whenever we need to mutate one slice of the profile (theme, about,
// skills, etc.) so the *other* fields ride along untouched.
export function buildProfilePreservePayload(
  user: any,
  overrides: Record<string, any> = {},
): Record<string, any> {
  if (!user) return { ...overrides };

  const base: Record<string, any> = {
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name,
    role: user.role,
    place_of_study: user.place_of_study ?? user.college,
    location: user.location,
    gender: user.gender,
    dob: user.dob,
    phone_number: user.phone_number ?? user.phone,
    about: user.about,
    career_status: user.career_status,
    current_situation: user.current_situation,
    theme_setting: user.theme_setting ?? user.theme_settings,
  };

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && v !== null) cleaned[k] = v;
  }
  return { ...cleaned, ...overrides };
}

export async function updateUserProfile(payload: any) {
  // Migrated to a strict Server Action. When the payload is FormData (e.g. a
  // profile update that includes the resume file) the action forwards it via
  // api.postForm so the multipart boundary is preserved; plain-object payloads
  // go through as JSON. The action's `data` is the verbatim backend body — the
  // old proxy reshaped it into { success, message, data: data?.data || data },
  // which we reproduce here so callers (useUpdateProfile reads `data?.data`)
  // keep their exact shape.
  const res = await updateUserProfileAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to update profile");
  }
  // The backend update-profile body is genuinely untyped (dynamic shape) — same
  // documented exception as src/app/actions/feed.ts / jobs.services.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backend = (res.data ?? {}) as any;
  return {
    success: true,
    message: backend?.message || "Profile updated successfully",
    data: backend?.data ?? backend,
  };
}


/**
 * Checks whether a phone number is already registered.
 * Returns the backend response body, e.g.
 *   { status: "OK"|"SUCCESS", message, data: { available: true } }   → free
 *   { status: "ERROR",        message, data: { available: false } }  → taken
 */
export type CheckPhoneAvailabilityResponse = {
  status?: string;
  message?: string;
  data?: { available?: boolean };
};

export async function checkPhoneAvailability(
  phoneNumber: string,
): Promise<CheckPhoneAvailabilityResponse> {
  // Use fetch directly instead of the shared axios instance. The axios
  // refresh-on-401 interceptor was retrying with an empty body (causing the
  // proxy to return 400 "phone_number is required"). We do the same
  // refresh-and-retry-once dance manually here so the body is guaranteed
  // to land on the retry.
  const trimmed = phoneNumber.trim();
  const payload = JSON.stringify({ phone_number: trimmed });

  const callOnce = async (): Promise<Response> =>
    fetch("/api/checkphonenumberAvailability", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload,
    });

  let res: Response;
  try {
    res = await callOnce();

    if (res.status === 401) {
      // Token expired — ask the auth proxy to refresh, then retry once.
      const refresh = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (refresh.ok) {
        res = await callOnce();
      }
    }
  } catch (err: any) {
    // console.error("checkPhoneAvailability network error:", err);
    throw new Error(err?.message || "Failed to check phone number availability");
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg =
      body?.message || `Failed to check phone number (HTTP ${res.status})`;
    console.error("checkPhoneAvailability ERROR:", res.status, body);
    throw new Error(msg);
  }

  return (body ?? {
    status: "ERROR",
    message: "Empty response from server",
    data: { available: false },
  }) as CheckPhoneAvailabilityResponse;
}


export async function getConnectionUserProfile(userId: string) {
  // Migrated to the PUBLIC get-user Server Action (soft auth; backend
  // /api/web/user/get-profile). The action's `data` is the verbatim backend
  // body; callers (ChatPanel / UserInfo) read `res?.data`.
  if (!userId) {
    throw new Error("User ID is required to fetch profile");
  }
  const res = await getConnectionUserProfileAction(userId);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch profile");
  }
  return res.data;
}