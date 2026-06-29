"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ConfirmModal from "@/components/commonUI/ConfirmModal";
import { authUrlWithCallback } from "@/lib/callbackUrl";
import { useHasSession } from "@/app/hooks/useHasSession";
import { useUserProfile } from "@/app/hooks/useUserProfile";

/**
 * Centralised authentication gate. Before any interaction that requires login
 * (apply, save, follow, comment, react, connect, message, book, account
 * actions), callers should invoke `ensureAuthed(actionLabel, onProceed)`.
 *
 * - If the user is authenticated, `onProceed()` runs immediately.
 * - Otherwise the shared ConfirmModal opens ("Log in to continue") with Sign Up /
 *   Login (no Cancel — the ✕ dismisses it). Login routes to
 *   `/auth?callbackUrl=<current-page>&tab=login` and Sign Up to `&tab=signup`
 *   (via the existing callbackUrl helper) so the user lands on the right view and
 *   returns to where they were afterwards.
 *
 * Modelled on `useApplyGate` so the two compose cleanly: gate auth first, then
 * the CV check, e.g. `ensureAuthed("apply", () => ensureCvReady(title, apply))`.
 *
 * Auth detection ORs three signals so neither login path is missed:
 *   - `useSession()` status === "authenticated"  (social login path)
 *   - `useHasSession()` cookie present            (email/password path)
 *   - cached `useUserProfile().data.id`           (already-loaded profile)
 */
export function useAuthGate() {
  const router = useRouter();
  const { status } = useSession();
  const { data: hasSession } = useHasSession();
  const { data: profileResponse } = useUserProfile();

  const isAuthenticated =
    status === "authenticated" ||
    hasSession === true ||
    !!profileResponse?.data?.id;

  // While the signals are still loading we don't yet KNOW the user is anonymous.
  // Treat that as indeterminate and don't prompt — proceed optimistically; the
  // server-side gate (requireAuth → 401 UNAUTHENTICATED) is the backstop.
  const isResolving = status === "loading" && hasSession === undefined;

  const [gateState, setGateState] = useState<{ open: boolean; actionLabel: string }>({
    open: false,
    actionLabel: "",
  });

  // Stable ref so opening the modal doesn't lock in a stale label if the caller
  // re-renders between trigger and confirm.
  const pendingRef = useRef<{ actionLabel: string }>({ actionLabel: "" });

  const ensureAuthed = useCallback(
    (actionLabel: string, onProceed: () => void) => {
      if (isAuthenticated || isResolving) {
        onProceed();
        return;
      }
      pendingRef.current = { actionLabel };
      setGateState({ open: true, actionLabel });
    },
    [isAuthenticated, isResolving],
  );

  const closeGate = useCallback(() => {
    setGateState((s) => ({ ...s, open: false }));
  }, []);

  // Imperatively open the login gate. Backstop for when a Server Action returns
  // `code:"UNAUTHENTICATED"` (the server is the source of truth on auth) even
  // though the client signals looked authenticated — e.g. a cookie expired
  // mid-session. Prompts login; it NEVER force-logs-out (REQUIREMENTS §5 R4).
  const openGate = useCallback((actionLabel = "") => {
    pendingRef.current = { actionLabel };
    setGateState({ open: true, actionLabel });
  }, []);

  // Build the auth URL (which already carries ?callbackUrl=<safe-path> when the
  // current location is worth preserving) and append the tab param so the auth
  // page opens directly on the requested view. `authUrlWithCallback` may or may
  // not already contain a "?", so pick the separator accordingly.
  const authUrlWithTab = useCallback((tab: "login" | "signup") => {
    const url = authUrlWithCallback("/auth");
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}tab=${tab}`;
  }, []);

  const handleLogin = useCallback(() => {
    closeGate();
    router.push(authUrlWithTab("login"));
  }, [router, closeGate, authUrlWithTab]);

  const handleSignup = useCallback(() => {
    closeGate();
    router.push(authUrlWithTab("signup"));
  }, [router, closeGate, authUrlWithTab]);

  // Two-action gate: Sign up (secondary) + Login (primary). There is no Cancel —
  // the modal's ✕ / overlay click dismisses it via onClose.
  const gateModal: ReactNode = (
    <ConfirmModal
      isOpen={gateState.open}
      onClose={closeGate}
      onConfirm={handleLogin}
      onCancel={handleSignup}
      title="Log in to continue"
      message="Please log in or create an account to continue this action."
      confirmText="Login"
      cancelText="Sign Up"
    />
  );

  return { ensureAuthed, openGate, gateModal, isAuthenticated, isResolving };
}

export default useAuthGate;
