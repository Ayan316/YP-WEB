"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, Copy, Download, Loader2, MoreVertical } from "lucide-react";
import { isCvEmpty, type CvData } from "./pdfFormatter";
import { useGeneratePdf } from "./useGeneratePdf";
import { useCopyCv } from "./useCopyCv";

interface CVActionsProps {
  cv: CvData;
  /** Whether the CV already has generated content. */
  hasContent: boolean;
  /** Open the (re)generate flow. Confirmation lives in the parent. */
  onRegenerate: () => void;
}

/** The app's existing header sparkle glyph, reused for Generate/Regenerate. */
function SparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20px"
      height="20px"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="m21.45 11.11l-3-1.5l-2.7-1.35l-1.35-2.7l-1.5-3c-.34-.68-1.45-.68-1.79 0l-1.5 3l-1.35 2.7l-2.7 1.35l-3 1.5c-.34.17-.55.52-.55.89s.21.72.55.89l3 1.5l2.7 1.35l1.35 2.7l1.5 3c.17.34.52.55.89.55s.73-.21.89-.55l1.5-3l1.35-2.7l2.7-1.35l3-1.5c.34-.17.55-.52.55-.89s-.21-.72-.55-.89Zm-3.89 1.5l-.84.42l-2.16 1.08l-.3.15l-.15.3L12 18.77l-2.11-4.21l-.15-.3l-.3-.15l-2.16-1.08l-.84-.42L5.23 12l1.21-.61l.84-.42l2.16-1.08l.3-.15l.15-.3L12 5.23l2.11 4.21l.15.3l.3.15l2.16 1.08l.84.42l1.21.61zM19.5 1.5l-.94 2.06l-2.06.94l2.06.94l.94 2.06l.94-2.06l2.06-.94l-2.06-.94z"
      />
    </svg>
  );
}

const ghostButton =
  "inline-flex items-center justify-center rounded-md p-1.5 text-foreground/80 transition-colors cursor-pointer hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

export default function CVActions({
  cv,
  hasContent,
  onRegenerate,
}: CVActionsProps) {
  const pdf = useGeneratePdf();
  const clip = useCopyCv();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const showActions = hasContent && !isCvEmpty(cv);

  // Close the mobile overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (menuOpen) firstItemRef.current?.focus();
  }, [menuOpen]);

  // ── Derived labels / icons per action state ───────────────────────────────
  const downloadLabel =
    pdf.status === "generating"
      ? "Generating PDF…"
      : pdf.status === "success"
        ? "PDF downloaded"
        : pdf.status === "error"
          ? "Download failed — retry"
          : "Download CV as PDF";

  const copyLabel =
    clip.status === "copying"
      ? "Copying…"
      : clip.status === "success"
        ? "Copied to clipboard"
        : clip.status === "error"
          ? "Copy failed — retry"
          : "Copy CV to clipboard";

  const DownloadIcon =
    pdf.status === "generating" ? (
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
    ) : pdf.status === "success" ? (
      <Check size={18} aria-hidden="true" />
    ) : (
      <Download size={18} aria-hidden="true" />
    );

  const CopyIcon =
    clip.status === "copying" ? (
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
    ) : clip.status === "success" ? (
      <Check size={18} aria-hidden="true" />
    ) : (
      <Copy size={18} aria-hidden="true" />
    );

  const onDownload = () => pdf.generate(cv);
  const onCopy = () => clip.copy(cv);

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ) ?? [],
    );
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Primary: Generate / Regenerate (unchanged look) */}
      <button
        type="button"
        onClick={onRegenerate}
        aria-label={
          hasContent ? "Regenerate Profile Summary" : "Generate Profile Summary"
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "16px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        <SparkleIcon />
        {hasContent ? "Regenerate" : "Generate"}
      </button>

      {showActions && (
        <>
          {/* Desktop: inline icon actions */}
          {/* <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={onDownload}
              disabled={pdf.isGenerating}
              aria-label={downloadLabel}
              title={downloadLabel}
              className={ghostButton}
            >
              {DownloadIcon}
            </button>
            <button
              type="button"
              onClick={onCopy}
              disabled={clip.isCopying}
              aria-label={copyLabel}
              title={copyLabel}
              className={ghostButton}
            >
              {CopyIcon}
            </button>
          </div> */}

          {/* Mobile: overflow menu */}
          <div className="relative sm:hidden">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More CV actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={ghostButton}
            >
              <MoreVertical size={18} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label="CV actions"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 z-50 mt-1 min-w-[184px] rounded-md border border-border bg-card p-1 text-card-foreground shadow-md"
              >
                <button
                  ref={firstItemRef}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDownload();
                  }}
                  disabled={pdf.isGenerating}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                >
                  {DownloadIcon}
                  <span>
                    {pdf.status === "generating"
                      ? "Generating…"
                      : "Download PDF"}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopy();
                  }}
                  disabled={clip.isCopying}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                >
                  {CopyIcon}
                  <span>{clip.status === "copying" ? "Copying…" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
