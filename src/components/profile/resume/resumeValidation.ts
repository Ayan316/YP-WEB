// ───────────────────────────────────────────────────────────────────────────
// Resume upload — validation rules
//
// Only PDFs are accepted, up to 5MB. All other formats (.doc, .docx, .txt,
// .jpg, .png, .zip, …) are rejected. Pure, framework-free so it can be reused
// by the field hook and unit-tested in isolation.
// ───────────────────────────────────────────────────────────────────────────

export const RESUME_MIME_TYPE = "application/pdf";
export const RESUME_ACCEPT_ATTR = "application/pdf,.pdf";
export const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (matches helper text)

export const RESUME_ERRORS = {
  type: "Only PDF files are supported",
  size: "Resume exceeds maximum size",
} as const;

export interface ResumeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a chosen file for the resume field.
 *
 * MIME is the primary check; we also accept a `.pdf` extension when the browser
 * reports an empty MIME type (happens for some OS/file combinations). Anything
 * else — including a `.pdf`-named file with a non-PDF MIME — is rejected.
 */
export function validateResumeFile(file: File): ResumeValidationResult {
  const hasPdfExtension = /\.pdf$/i.test(file.name);
  const isPdf =
    file.type === RESUME_MIME_TYPE || (file.type === "" && hasPdfExtension);

  if (!isPdf) {
    return { valid: false, error: RESUME_ERRORS.type };
  }
  if (file.size > RESUME_MAX_SIZE_BYTES) {
    return { valid: false, error: RESUME_ERRORS.size };
  }
  return { valid: true };
}

/** Derive a human-readable filename from a stored resume URL. */
export function resumeNameFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const clean = url.split("?")[0].split("#")[0];
    const base = clean.substring(clean.lastIndexOf("/") + 1);
    return decodeURIComponent(base) || "Resume.pdf";
  } catch {
    return "Resume.pdf";
  }
}

/** Format a byte size as a short, human-readable string (e.g. "1.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
