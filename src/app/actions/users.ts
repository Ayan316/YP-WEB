"use server";

// Read Server Action for the PUBLIC get-user profile (REQUIREMENTS §4.4 / §11).
//
// Replaces `src/app/api/get-user` (backend POST /api/web/user/get-profile).
// This is the PUBLIC get-user — distinct from auth/get-user (on the keep-list).
// It is consumed by interactive authed client components (ChatPanel / UserInfo)
// to show another user's public profile, so it is an Action (not an RSC).
//
// Soft auth: attaches the viewer's token when present (so connection state /
// connect_id is personalised) but never 401s. The returned envelope's `data`
// is the verbatim backend body — the call sites read `res.data`.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

/** POST /api/web/user/get-profile — another user's public profile by id. */
export async function getConnectionUserProfileAction(userId: string) {
  if (!userId) {
    return {
      status: "ERROR" as const,
      message: "User ID is required to fetch profile",
      data: null,
    };
  }
  // Verbatim backend profile body (dynamic shape); the call sites read
  // `res?.data`. `data` is `any` to preserve the original axios pass-through
  // ergonomics — same documented exception as src/app/actions/feed.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(
    EP.connectionUserProfile,
    { id: userId },
    { auth: "soft" },
  );
}
