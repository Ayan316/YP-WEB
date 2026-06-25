"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import {
  REPORT_REASONS,
  ReportReason,
  ReportedType,
  submitReport,
} from "@/services/moderation.services";
import { isUnauthenticatedError } from "@/lib/authError";
import mainstyles from "@/moduleCss/jobDetails.module.css";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportedType: ReportedType;
  reportedId: string;
}

const DESCRIPTION_MAX = 500;

export default function ReportDialog({
  open,
  onClose,
  reportedType,
  reportedId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Reset form state whenever the dialog is opened or the target changes so
  // the "Other" description does not carry over between different reports.
  useEffect(() => {
    if (open) {
      setReason("");
      setDescription("");
      setDescriptionError("");
    }
  }, [open, reportedId, reportedType]);

  const trimmedDescription = description.trim();
  const isOtherReason = reason === "other";
  const isOtherDescriptionMissing =
    isOtherReason && trimmedDescription.length === 0;
  const canSubmit =
    !!reason && !isOtherDescriptionMissing && !isSubmitting;

  const handleSubmit = async () => {
    if (!reason) return;

    if (isOtherReason && trimmedDescription.length === 0) {
      setDescriptionError("Please describe the issue to submit this report.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReport({
        reported_type: reportedType,
        reported_id: reportedId,
        reason,
        description: trimmedDescription || undefined,
      });
      toast.success("Report submitted. We will review it within 24 hours.");
      setReason("");
      setDescription("");
      setDescriptionError("");
      onClose();
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? err?.message ?? "";
      // The report launch sites already gate on auth via useAuthGate; if the
      // session lapsed between opening this dialog and submitting, close and
      // prompt login rather than force-logout (REQUIREMENTS §5 R4).
      if (isUnauthenticatedError(err)) {
        toast.error("Please log in to submit a report.");
        onClose();
        return;
      }
      if (/already reported/i.test(msg)) {
        onClose();
        return;
      }
      toast.error(msg || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center"
      style={{
        background: isLight ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl p-6 max-w-md w-full mx-4"
        style={{
          background: isLight
            ? "#fff"
            : "#040f1f url(/_next/static/media/gradient-bg.512ca683.png) 50%/cover no-repeat",
          border: isLight
            ? "1px solid #E8EEFE"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isLight
            ? "0 24px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)"
            : "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className={`absolute top-4 right-4 transition-colors ${
            isLight
              ? "text-gray-400 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
          style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
        >
          <X className="w-5 h-5 cursor-pointer" />
        </button>

        {/* Title */}
        <h2
          className="text-lg font-semibold text-center mb-1"
          style={{ color: isLight ? "#040F1F" : "#fff" }}
        >
          Report {reportedType}
        </h2>
        <p
          className="text-sm text-center mb-4"
          style={{ color: isLight ? "#888888" : "#9ca3af" }}
        >
          Help us understand what&apos;s happening with this content.
        </p>

        {/* Reason picker */}
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px", marginTop: "8px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            {REPORT_REASONS.map(({ value, label }) => {
              const isSelected = reason === value;
              return (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    // Use a transparent base border of the same width in every
                    // state to avoid a 1px layout shift when selection toggles.
                    border: "1px solid transparent",
                    // Outline renders outside the box, so toggling it never
                    // causes the label to reflow (fixes the "jumping" issue).
                    outline: isSelected
                      ? `1px solid ${isLight ? "#356FEE" : "#20BDFF"}`
                      : `1px solid ${isLight ? "#E8EEFE" : "rgba(255,255,255,0.08)"}`,
                    outlineOffset: "-1px",
                    background: isSelected
                      ? isLight
                        ? "#F0F4FF"
                        : "rgba(32, 189, 255, 0.08)"
                      : "transparent",
                    transition:
                      "background-color 0.15s ease, outline-color 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={isSelected}
                    onChange={() => {
                      setReason(value);
                      setDescriptionError("");
                    }}
                    style={{
                      accentColor: isLight ? "#356FEE" : "#20BDFF",
                      width: "16px",
                      height: "16px",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      // Keep a constant weight between selected/unselected so
                      // different glyph widths do not shift neighbouring rows.
                      fontWeight: 500,
                      color: isLight ? "#040F1F" : "#E2E8F0",
                    }}
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Description — only visible when "other" is selected */}
          {isOtherReason && (
            <div style={{ marginBottom: "16px" }}>
              <textarea
                placeholder="Please describe the issue... *"
                value={description}
                onChange={(e) => {
                  const next = e.target.value.slice(0, DESCRIPTION_MAX);
                  setDescription(next);
                  if (descriptionError && next.trim().length > 0) {
                    setDescriptionError("");
                  }
                }}
                rows={3}
                maxLength={DESCRIPTION_MAX}
                aria-invalid={descriptionError ? "true" : "false"}
                aria-describedby="report-description-counter"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: descriptionError
                    ? "1px solid #ef4444"
                    : isLight
                      ? "1px solid #E8EEFE"
                      : "1px solid rgba(255,255,255,0.08)",
                  background: isLight ? "#F8F9FC" : "rgba(255,255,255,0.04)",
                  color: isLight ? "#040F1F" : "#E2E8F0",
                  fontSize: "14px",
                  padding: "10px 12px",
                  resize: "none",
                  outline: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "6px",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: descriptionError ? "#ef4444" : "transparent",
                    minHeight: "16px",
                  }}
                >
                  {descriptionError || "placeholder"}
                </span>
                <span
                  id="report-description-counter"
                  aria-live="polite"
                  style={{
                    fontSize: "12px",
                    color: isLight ? "#888888" : "#9ca3af",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`${
              isLight
                ? "light-save-btn width-auto-css flex-1 w-full"
                : `flex-1 py-2.5 text-sm font-medium transition-all ${mainstyles.jobDetails_job_item_btns} social-media-btn gradient-border-btn`
            }`}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-2.5 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 btn-gradient ${
              isLight ? "light-apply-btn width-auto-css w-full" : ""
            }`}
            style={{
              height: "36px",
              fontSize: "12px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {isSubmitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
