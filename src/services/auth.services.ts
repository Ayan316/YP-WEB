"use server";

// Auth pre-login flows + account deletion — migrated off the client axios
// transport (REQUIREMENTS §10 Phase 4). This module is a set of Server Actions
// ("use server"); the httpOnly-cookie → Bearer translation and the inline
// refresh/rotation are owned by the server gateway src/lib/api.ts (D2/D5), so
// there is no client transport and no public backend-origin env var.
//
//   - forgotPassword / resetPassword / resendOtp: pre-auth flows on the backend
//     (/api/mobile/auth/*). They run with auth:"none" (no token to attach).
//   - deleteAccount: a strict write — the gateway attaches the access cookie as
//     a Bearer and rotates it on 401. Returns the same { status, message } shape
//     the call sites (Header / ProfileDropDown) expect.

import { api } from "@/lib/api";

interface AuthResponse {
  message: string;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export async function deleteAccount(
  userId: string,
  pushToken: string = "",
): Promise<{ status: number; message?: string }> {
  const res = await api.post<{ message?: string }>(
    "/api/mobile/account/delete/",
    { user_id: userId, push_token: pushToken },
    { auth: "strict" },
  );

  if (res.status !== "OK") {
    const err = new Error(
      res.message || "Failed to delete account",
    ) as Error & { status?: number };
    if (res.code === "UNAUTHENTICATED") err.status = 401;
    throw err;
  }

  return { status: 200, message: res.data?.message };
}

export async function forgotPassword(
  identifier: string,
  value: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(
    "/api/mobile/auth/forgot-password",
    { identifier, value },
    { auth: "none" },
  );

  if (res.status !== "OK") {
    throw new Error(
      res.message || "An error occurred while processing your request.",
    );
  }

  // The old proxy returned the backend body verbatim; the call site
  // (forgot-password/page) reads `response.data.user.id`. Preserve the original
  // service's behaviour of throwing when the backend body itself signals ERROR.
  const body = (res.data ?? { message: "OK", status: "OK" }) as AuthResponse;
  if (body.status === "ERROR") {
    throw new Error(body.message || "An error occurred while processing your request.");
  }
  return body;
}

export async function resetPassword(
  userId: string,
  otp: string,
  newPassword: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(
    "/api/mobile/auth/change-password",
    { user_id: userId, otp, new_password: newPassword },
    { auth: "none" },
  );

  if (res.status !== "OK") {
    throw new Error(
      res.message || "An error occurred while processing your request.",
    );
  }

  return (res.data ?? { message: "OK", status: "OK" }) as AuthResponse;
}

export async function resendOtp(
  purpose: "SIGNUP" | "TWO_FACTOR" | "FORGOT_PASSWORD",
  identifier: "email" | "phone",
  value: string,
  userId?: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(
    "/api/mobile/auth/resend-otp",
    { purpose, identifier, value, user_id: userId },
    { auth: "none" },
  );

  if (res.status !== "OK") {
    throw new Error(
      res.message || "An error occurred while processing your request.",
    );
  }

  return (res.data ?? { message: "OK", status: "OK" }) as AuthResponse;
}
