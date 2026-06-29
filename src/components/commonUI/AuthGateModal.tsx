"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import mainstyles from "@/moduleCss/jobDetails.module.css";
import { useTheme } from "@/context/ThemeContext";

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Primary action — route to the auth page with the LOGIN tab forced. */
  onLogin: () => void;
  /** Secondary action — route to the auth page with the SIGNUP tab forced. */
  onSignUp: () => void;
  title?: string;
  message?: string;
  loginText?: string;
  signUpText?: string;
  cancelText?: string;
}

/**
 * Dedicated three-button modal for the authentication gate
 * (Login / Sign Up / Cancel).
 *
 * Kept separate from the shared `ConfirmModal` (which is intentionally a
 * two-button confirm/cancel dialog used in ~12 other places) so that adding a
 * third action here carries zero risk to those call sites. Styling, animation,
 * theming (ThemeContext `isLight`) and the createPortal structure mirror
 * `ConfirmModal` so the two look consistent.
 */
export default function AuthGateModal({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
  title = "Log in to continue",
  message = "Please log in or create an account to continue this action.",
  loginText = "Login",
  signUpText = "Sign Up",
  cancelText = "Cancel",
}: AuthGateModalProps) {
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
        .auth-gate-overlay {
          animation: overlayIn 0.22s ease forwards;
        }
        .auth-gate-overlay.closing {
          animation: overlayOut 0.22s ease forwards;
        }
        .auth-gate-modal {
          animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .auth-gate-modal.closing {
          animation: modalOut 0.22s ease forwards;
        }
        /* Light-mode globals set 16px (with !important on save), so force
           12px here for the action buttons. */
        .auth-gate-modal .light-save-btn,
        .auth-gate-modal .light-apply-btn {
          font-size: 12px !important;
        }
      `}</style>

      <div
        className={`fixed inset-0 flex items-center justify-center glass-effect-modal-overlay auth-gate-overlay${
          !animating ? " closing" : ""
        }`}
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <div
          className={`relative rounded-2xl p-6 w-[90%] max-w-sm glass-effect-modal bg-slate-900 auth-gate-modal${
            !animating ? " closing" : ""
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            style={{ cursor: "pointer" }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <h2
            className="text-white text-lg font-semibold text-center mb-2"
            style={isLight ? { color: "#040F1F" } : {}}
          >
            {title}
          </h2>

          {/* Message */}
          <p
            className="text-gray-400 text-sm text-center mb-6"
            style={isLight ? { color: "#888888" } : {}}
          >
            {message}
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onLogin}
              className={`w-full py-2.5 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 btn-gradient ${
                isLight ? "light-apply-btn width-auto-css" : ""
              }`}
              style={{
                height: "36px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {loginText}
            </button>

            <button
              onClick={onSignUp}
              className={`${
                isLight
                  ? "light-save-btn width-auto-css w-full"
                  : `w-full py-2.5 text-sm font-medium transition-all ${mainstyles.jobDetails_job_item_btns} social-media-btn gradient-border-btn`
              }`}
              style={{
                height: "36px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {signUpText}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              style={{
                height: "36px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
