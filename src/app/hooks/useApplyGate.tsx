"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/commonUI/ConfirmModal";
import { useUserProfile } from "@/app/hooks/useUserProfile";

type GateIntent = "apply" | "view";

interface ApplyGateState {
  open: boolean;
  jobTitle: string;
  intent: GateIntent;
}

/**
 * Centralised CV gate. Before applying for OR viewing a job from anywhere
 * in the app, callers should invoke `ensureCvReady(jobTitle, onProceed, intent?)`.
 *
 * - If the user already has both `strengths_summary` and `interests_summary`
 *   on their profile, `onProceed()` runs immediately (existing flow).
 * - Otherwise the shared ConfirmModal opens prompting the user to generate
 *   their AI CV first. Confirm routes to the user's profile page with
 *   `?openSummary=1` so `SummeryCard` auto-opens the generation modal.
 *
 * `intent` defaults to "apply" for backwards compatibility.
 */
export function useApplyGate() {
  const router = useRouter();
  const { data: profileResponse } = useUserProfile();
  const profile = profileResponse?.data;

  const [gateState, setGateState] = useState<ApplyGateState>({
    open: false,
    jobTitle: "",
    intent: "apply",
  });

  // Stable ref so opening the modal doesn't lock in a stale jobTitle if the
  // caller re-renders between trigger and confirm.
  const pendingRef = useRef<{ jobTitle: string; intent: GateIntent }>({
    jobTitle: "",
    intent: "apply",
  });

  const hasCv = !!(
    profile?.strengths_summary &&
    String(profile.strengths_summary).trim().length > 0 &&
    profile?.interests_summary &&
    String(profile.interests_summary).trim().length > 0
  );

  const ensureCvReady = useCallback(
    (
      jobTitle: string,
      onProceed: () => void,
      intent: GateIntent = "apply",
    ) => {
      if (hasCv) {
        onProceed();
        return;
      }
      pendingRef.current = { jobTitle, intent };
      setGateState({ open: true, jobTitle, intent });
    },
    [hasCv],
  );

  const closeGate = useCallback(() => {
    setGateState((s) => ({ ...s, open: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    closeGate();
    const userId = profile?.id;
    const target = userId
      ? `/profile/${userId}?openSummary=1`
      : `/profile?openSummary=1`;
    router.push(target);
  }, [router, profile?.id, closeGate]);

  const verb = gateState.intent === "view" ? "viewing for" : "applying for";

  const gateModal: ReactNode = (
    <ConfirmModal
      isOpen={gateState.open}
      onClose={closeGate}
      onConfirm={handleConfirm}
      title="Generate your CV first"
      message={
        <>
          You need an AI-generated CV before {verb}{" "}
          <strong>{gateState.jobTitle || "this job"}</strong>. Generate one now?
        </>
      }
      confirmText="Generate CV"
      cancelText="Not now"
    />
  );

  return { ensureCvReady, gateModal, hasCv };
}

export default useApplyGate;
