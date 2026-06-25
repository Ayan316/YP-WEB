"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "react-toastify";
import { useUpdateProfile } from "@/app/hooks/useUpdateProfile";
import {
  buildResumeRemovePayload,
  buildResumeUploadFormData,
  type ProfileLike,
} from "./profileFormMapper";
import { resumeNameFromUrl, validateResumeFile } from "./resumeValidation";

export type ResumeStatus =
  | "idle"
  | "selected"
  | "uploading"
  | "saved"
  | "error";

interface UseResumeFieldArgs {
  /** The current profile object (source of truth for an existing resume). */
  user: ProfileLike;
  /** Optimistic cache write-through, mirrors the other profile cards. */
  onUpdated?: (patch: Record<string, unknown>) => void;
}

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Owns the resume field's local state and the two profile-update calls
 * (upload via multipart, remove via JSON). The UI stays declarative — it reads
 * `status`, `resumeName`, `pendingSelection`, etc. and calls the actions.
 */
export function useResumeField({ user, onUpdated }: UseResumeFieldArgs) {
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs created for in-tab viewing — revoked on unmount.
  const objectUrls = useRef<string[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Kept after a successful upload so the filename + View work immediately,
  // even before a full profile refetch returns the stored URL.
  const [savedFile, setSavedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ResumeStatus>("idle");

  const existingUrl: string | null =
    user?.resume_url ?? user?.resume ?? null;

  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const resumeName = useMemo(() => {
    if (selectedFile) return selectedFile.name;
    if (savedFile) return savedFile.name;
    if (existingUrl) return resumeNameFromUrl(existingUrl);
    return null;
  }, [selectedFile, savedFile, existingUrl]);

  const hasResume = Boolean(selectedFile || savedFile || existingUrl);
  const pendingSelection = Boolean(selectedFile);
  const isBusy = status === "uploading";

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setStatus("idle");
  }, []);

  // Validate + stage a file. Shared by the file input and drag-and-drop.
  const selectFile = useCallback((file: File) => {
    const result = validateResumeFile(file);
    if (!result.valid) {
      setError(result.error ?? "Invalid file");
      setStatus("error");
      toast.error(result.error ?? "Invalid file");
      return;
    }
    setSelectedFile(file);
    setError(null);
    setStatus("selected");
  }, []);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so selecting the same file again re-fires change.
      e.target.value = "";
      if (file) selectFile(file);
    },
    [selectFile],
  );

  const view = useCallback(() => {
    const file = selectedFile ?? savedFile;
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (existingUrl) {
      window.open(existingUrl, "_blank", "noopener,noreferrer");
    }
  }, [selectedFile, savedFile, existingUrl]);

  const save = useCallback(async () => {
    if (!selectedFile) return;
    setStatus("uploading");
    setError(null);
    try {
      const formData = buildResumeUploadFormData(user, selectedFile);
      await updateProfile.mutateAsync(formData);

      setSavedFile(selectedFile);
      setSelectedFile(null);
      setStatus("saved");
      toast.success("Resume uploaded");

      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      // Preserve the local selection so the user can retry.
      const message = errorMessage(err, "Failed to upload resume");
      setStatus("error");
      setError(message);
      toast.error(message);
    }
  }, [selectedFile, user, updateProfile]);

  const remove = useCallback(async () => {
    // A locally-selected (unsaved) file with no stored resume → just discard.
    if (selectedFile && !savedFile && !existingUrl) {
      clearSelection();
      return;
    }

    setStatus("uploading");
    setError(null);
    try {
      await updateProfile.mutateAsync(buildResumeRemovePayload(user));
      setSavedFile(null);
      setSelectedFile(null);
      setStatus("idle");
      onUpdated?.({ resume: null, resume_url: null });
      toast.success("Resume removed");
    } catch (err) {
      const message = errorMessage(err, "Failed to remove resume");
      setStatus("error");
      setError(message);
      toast.error(message);
    }
  }, [selectedFile, savedFile, existingUrl, user, updateProfile, onUpdated, clearSelection]);

  return {
    fileInputRef,
    status,
    error,
    resumeName,
    hasResume,
    pendingSelection,
    isBusy,
    openFilePicker,
    onFileChange,
    selectFile,
    clearSelection,
    view,
    save,
    remove,
  };
}
