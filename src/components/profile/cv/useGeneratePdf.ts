"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { cvFileName, drawCvPdf, isCvEmpty, type CvData } from "./pdfFormatter";

export type PdfStatus = "idle" | "generating" | "success" | "error";

/**
 * Trigger a file download cross-browser without ever calling window.open().
 *
 * Production hardening: jsPDF's own doc.save() can fall back to window.open()
 * in some browsers, and because we download *after* an async import the popup
 * blocker may kill that tab. A Blob + programmatic <a download> click is the
 * reliable path on Chrome/Firefox/Safari (and legacy Edge via msSaveOrOpenBlob).
 */
function downloadBlob(blob: Blob, filename: string): void {
  const legacyNav = navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, f: string) => boolean;
  };
  if (typeof legacyNav.msSaveOrOpenBlob === "function") {
    legacyNav.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  // Firefox requires the anchor to be in the document for .click() to work.
  document.body.appendChild(a);
  a.click();
  // Defer cleanup so the download has a chance to start.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Generates and downloads the CV as a PDF.
 *
 * - jsPDF is lazy-imported so it stays out of the main bundle and generation
 *   never blocks first paint.
 * - Exposes a small state machine (idle → generating → success | error) the UI
 *   can reflect, and surfaces outcomes via the app's existing toast pattern.
 */
export function useGeneratePdf() {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2500);
  }, []);

  const generate = useCallback(
    async (cv: CvData) => {
      if (isCvEmpty(cv)) return;
      setStatus("generating");
      try {
        // Lazy-load the renderer; the dynamic import also yields a frame so the
        // "Generating…" state can paint before the (synchronous) layout work.
        const { jsPDF } = await import("jspdf");
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
        drawCvPdf(doc, cv);

        // Build a Blob and download it ourselves (see downloadBlob note) rather
        // than doc.save(), so the behaviour is identical and reliable in prod.
        const blob = doc.output("blob");
        downloadBlob(blob, cvFileName(cv.name));

        setStatus("success");
        toast.success("CV downloaded");
      } catch (err) {
        console.error("[useGeneratePdf] PDF generation failed:", err);
        setStatus("error");
        toast.error("Couldn't generate the PDF. Please try again.");
      } finally {
        scheduleReset();
      }
    },
    [scheduleReset],
  );

  return { status, generate, isGenerating: status === "generating" };
}
