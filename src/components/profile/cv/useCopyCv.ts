"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { cvToPlainText, isCvEmpty, type CvData } from "./pdfFormatter";

export type CopyStatus = "idle" | "copying" | "success" | "error";

/** Copy the formatted CV (clean text only — no HTML/Markdown) to the clipboard. */
export function useCopyCv() {
  const [status, setStatus] = useState<CopyStatus>("idle");
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

  const copy = useCallback(
    async (cv: CvData) => {
      if (isCvEmpty(cv)) return;
      const text = cvToPlainText(cv);
      setStatus("copying");
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for non-secure contexts / older browsers.
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-1000px";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          if (!ok) throw new Error("execCommand('copy') returned false");
        }
        setStatus("success");
        toast.success("CV copied to clipboard");
      } catch (err) {
        console.error("[useCopyCv] Clipboard write failed:", err);
        setStatus("error");
        toast.error("Couldn't copy the CV. Please try again.");
      } finally {
        scheduleReset();
      }
    },
    [scheduleReset],
  );

  return { status, copy, isCopying: status === "copying" };
}
