"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import mainstyles from "@/moduleCss/jobDetails.module.css";
import { useTheme } from "@/context/ThemeContext";
import { is } from "date-fns/locale";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  // Optional custom handler for the left (secondary) button. Defaults to
  // `onClose` so existing cancel-style modals are unaffected; callers like the
  // auth gate pass their own (e.g. "Sign up") to make it a second action.
  onCancel?: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  loadingText,
}: ConfirmModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Ensure we're on the client before using createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !visible) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes confirmSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes overlayOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(16px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modalOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.92) translateY(16px);
          }
        }
        .confirm-overlay {
          animation: overlayIn 0.22s ease forwards;
        }
        .confirm-overlay.closing {
          animation: overlayOut 0.22s ease forwards;
        }
        .confirm-modal {
          animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .confirm-modal.closing {
          animation: modalOut 0.22s ease forwards;
        }
        /* Light-mode globals set 16px (with !important on save), so force
           12px here for the ConfirmModal action buttons. */
        .confirm-modal .light-save-btn,
        .confirm-modal .light-apply-btn {
          font-size: 12px !important;
        }
      `}</style>

      <div
        className={`fixed inset-0 flex items-center justify-center glass-effect-modal-overlay confirm-overlay${
          !animating ? " closing" : ""
        }`}
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <div
          className={`relative rounded-2xl p-6 w-[90%] max-w-sm glass-effect-modal bg-slate-900 confirm-modal${
            !animating ? " closing" : ""
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <h2 className="text-white text-lg font-semibold text-center mb-2" style={isLight ? { color: "#040F1F" } : {}}>
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-400 text-sm text-center mb-6" style={isLight ? { color: "#888888" } : {}}>
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel ?? onClose}
              disabled={isLoading}
              className={`${isLight ? "light-save-btn width-auto-css flex-1 w-full" : `flex-1 py-2.5 text-sm font-medium transition-all ${mainstyles.jobDetails_job_item_btns} social-media-btn gradient-border-btn`}`}
              style={{
                height: "36px",
                fontSize: "12px",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 btn-gradient ${isLight ? "light-apply-btn width-auto-css w-full" : ""}`}
              style={{
                height: "36px",
                fontSize: "12px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.6)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "confirmSpin 0.7s linear infinite",
                    }}
                  />
                  {loadingText ?? confirmText}
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
