"use client";

import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useState,
} from "react";
import { Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import styles from "../../../moduleCss/profile.module.css";
import { RESUME_ACCEPT_ATTR } from "./resumeValidation";
import { useResumeField } from "./useResumeField";
import type { ProfileLike } from "./profileFormMapper";
import { useAuthGate } from "@/app/hooks/useAuthGate";

interface ResumeUploaderProps {
  /** Current profile object (used to preserve fields on update). */
  user: ProfileLike;
  /** Optimistic cache write-through from the profile page. */
  onUpdated?: (patch: Record<string, unknown>) => void;
}

// Token-based ghost button — theme-aware, no hardcoded colours.
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors cursor-pointer hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

// Primary CTA — reuses the app's gradient button at the same size as the
// Profile Summary "Get Started" button.
const primaryBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12.5px",
  padding: "8px 20px",
  borderRadius: "20px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function ResumeUploader({ user, onUpdated }: ResumeUploaderProps) {
  const {
    fileInputRef,
    error,
    resumeName,
    hasResume,
    pendingSelection,
    isBusy,
    openFilePicker,
    onFileChange,
    selectFile,
    view,
    save,
    remove,
  } = useResumeField({ user, onUpdated });

  const { ensureAuthed, gateModal: authGateModal } = useAuthGate();

  // Auth-gate the two resume writes (upload via save, remove via update-profile).
  const handleSave = () => ensureAuthed("update your profile", () => save());
  const handleRemove = () => ensureAuthed("update your profile", () => remove());

  const [dragging, setDragging] = useState(false);

  // The drop zone is an interactive picker only when empty + idle; once a file
  // is present the inner action buttons take over.
  const idle = !hasResume && !isBusy;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isBusy) setDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isBusy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!idle) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className="mt-4">
      <div className="card_custom card_dark-bg">
        <div className={styles.profileInfo}>
          <div className={styles.nameWrapper}>
            <h2 className={styles.section_title}>Upload CV</h2>

            {/* Header actions (top-right) — present once a resume is selected,
                including while uploading (disabled during the save). */}
            {hasResume && (
              <div className="flex flex-wrap items-center justify-end gap-1">
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={view}
                  disabled={isBusy}
                  aria-label="View resume"
                >
                  <Eye size={16} aria-hidden="true" />
                  View
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={openFilePicker}
                  disabled={isBusy}
                  aria-label="Replace resume"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Replace
                </button>
                <button
                  type="button"
                  className={`${ghostBtn} text-destructive hover:text-destructive`}
                  onClick={handleRemove}
                  disabled={isBusy}
                  aria-label="Remove resume"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Hidden, accessible file input driven by the drop zone / buttons. */}
          <input
            ref={fileInputRef}
            type="file"
            accept={RESUME_ACCEPT_ATTR}
            onChange={onFileChange}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div
            className={`resume-dropzone mt-3 flex flex-col items-center justify-center gap-3 px-5 py-6 text-center ${
              idle || isBusy ? "min-h-[150px]" : "min-h-[96px]"
            } ${dragging ? "dragging" : ""} ${idle ? "cursor-pointer" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={idle ? openFilePicker : undefined}
            onKeyDown={handleKeyDown}
            role={idle ? "button" : "group"}
            tabIndex={idle ? 0 : -1}
            aria-label={
              idle ? "Upload resume PDF. PDF only, maximum 5MB." : "Resume"
            }
            aria-busy={isBusy}
          >
            {isBusy ? (
              /* ── Uploading animation (while the profile-update API runs) ── */
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#20BDFF]/10">
                  <Upload
                    size={26}
                    className="animate-bounce text-[#20BDFF]"
                    aria-hidden="true"
                  />
                </div>
                <div
                  aria-live="polite"
                  className="flex flex-col items-center gap-1"
                >
                  <p className="text-sm font-medium text-foreground">
                    {pendingSelection ? "Uploading your CV…" : "Removing your CV…"}
                  </p>
                  {pendingSelection && resumeName && (
                    <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {resumeName}
                    </p>
                  )}
                </div>
                <div className="progress-bar-track relative mt-1 h-1.5 w-48 overflow-hidden rounded-full">
                  <div className="bar-bg-progress resume-upload-slide" />
                </div>
              </>
            ) : hasResume ? (
              /* ── Selected / uploaded: file info left, Save (when pending) right ── */
              <div className="flex w-full flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20BDFF]/10">
                    <FileText
                      size={22}
                      className="text-[#20BDFF]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[220px] truncate text-sm font-medium text-foreground">
                      {resumeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pendingSelection
                        ? "Selected — not saved yet"
                        : "PDF • saved"}
                    </p>
                  </div>
                </div>

                {pendingSelection && (
                  <button
                    type="button"
                    className="btn-gradient shrink-0"
                    style={primaryBtnStyle}
                    onClick={handleSave}
                    aria-label="Save resume"
                  >
                    Save
                  </button>
                )}
              </div>
            ) : (
              /* ── Empty / idle ── */
              <>
                <Upload className="h-14 w-14 text-gray-400" aria-hidden="true" />
                <span className="rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80">
                  Upload Here
                </span>
              </>
            )}
          </div>

          {/* Helper / error line */}
          {error ? (
            <p role="alert" className="mt-3 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              PDF only • Max 5MB
            </p>
          )}
        </div>
      </div>
      {authGateModal}
    </div>
  );
}
