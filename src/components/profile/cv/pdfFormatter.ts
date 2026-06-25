// ───────────────────────────────────────────────────────────────────────────
// Profile Summary — content formatting + PDF layout
//
// Pure, framework-free helpers shared by the Download-PDF and Copy-to-Clipboard
// actions. The on-screen "Profile Summary" is two Markdown blobs (strength + interest)
// plus the profile name; here we parse that same content into an ordered block
// model and render it to either clean text or a multi-page PDF.
//
// NOTE on colours: a PDF is a static print artifact with no light/dark mode, so
// the few colours below are fixed print tones (not UI theme tokens). All on-
// screen UI uses design-system tokens — see CVActions.tsx.
// ───────────────────────────────────────────────────────────────────────────

import type { jsPDF } from "jspdf";

export interface CvData {
  /** Full profile name shown as the document title. */
  name: string;
  /** Strength summary (Markdown). May contain its own ## sub-sections. */
  strength: string;
  /** Interest summary (Markdown). May contain its own ## sub-sections. */
  interest: string;
}

export type CvBlock =
  | { type: "title"; text: string }
  | { type: "groupHeading"; text: string }
  | { type: "sectionHeading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

// ─── Markdown helpers (mirrors SummeryCard's on-screen normalisation) ────────

/** Strip inline Markdown emphasis so output is clean text. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

/**
 * Normalise inconsistent AI output before parsing: split "## Heading — inline"
 * lines, promote bare title-case section names to headings, drop trailing empty
 * section labels. Kept intentionally close to SummeryCard.normalizeMd so the
 * PDF/clipboard match what the user sees.
 */
function normalizeMarkdown(text: string): string {
  const isSectionLabel = (s: string) => /^(SKILLS|SUMMARY):?\s*$/.test(s.trim());
  const isFiller = (s: string) =>
    s.trim() === "" || /^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(s);

  const rawLines = text.split("\n");
  let endIdx = rawLines.length;
  while (endIdx > 0) {
    const last = rawLines[endIdx - 1];
    if (isFiller(last) || isSectionLabel(last)) {
      endIdx--;
      continue;
    }
    break;
  }
  const lines = rawLines.slice(0, endIdx);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      const m = trimmed.match(/^(##\s+.+?)\s*[—–]\s*(.+)$/);
      if (m) {
        out.push(m[1].trim());
        if (m[2].trim()) out.push(m[2].trim());
        i++;
        continue;
      }
    }
    if (/^[•·●]\s*$/.test(trimmed) && i + 1 < lines.length) {
      out.push(`- ${lines[i + 1].trim()}`);
      i += 2;
      continue;
    }
    if (/^([A-Z][a-z]+ ){1,4}[A-Z][a-z]+$/.test(trimmed)) {
      out.push(`## ${trimmed}`);
      i++;
      continue;
    }
    if (/^[A-Z][^#\n]+[—–]\s*$/.test(trimmed)) {
      out.push(`## ${trimmed.replace(/\s*[—–]\s*$/, "")}`);
      i++;
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse a Markdown blob into section headings / paragraphs / bullets. */
function parseMarkdownBlocks(md: string): CvBlock[] {
  const blocks: CvBlock[] = [];
  for (const raw of normalizeMarkdown(md).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(line)) continue; // horizontal rule
    if (/^(SKILLS|SUMMARY):?\s*$/i.test(line)) {
      blocks.push({ type: "sectionHeading", text: titleCase(line.replace(/:$/, "")) });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "sectionHeading", text: stripInline(line.slice(3)) });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "sectionHeading", text: stripInline(line.slice(2)) });
      continue;
    }
    if (/^[-*•·●•]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: stripInline(line.replace(/^[-*•·●•]\s+/, "")) });
      continue;
    }
    blocks.push({ type: "paragraph", text: stripInline(line) });
  }
  return blocks;
}

/**
 * Drop a leading section heading that just restates the group it lives under
 * (e.g. a "Professional Strength" heading at the top of the strength blob),
 * so we don't render it twice beneath our injected group heading.
 */
function dropRedundantLeadHeading(blocks: CvBlock[]): CvBlock[] {
  const first = blocks[0];
  if (
    first?.type === "sectionHeading" &&
    /\b(summary|strengths?|interests?|passions?|professional strength)\b/i.test(
      first.text,
    )
  ) {
    return blocks.slice(1);
  }
  return blocks;
}

// ─── Public content model ────────────────────────────────────────────────────

export function isCvEmpty(cv: CvData): boolean {
  return !((cv.strength || "").trim() || (cv.interest || "").trim());
}

/**
 * Ordered block model for the whole CV:
 *   Profile Name → Strength Summary (+ its sub-sections) → Interest Summary (…)
 */
export function buildCvBlocks(cv: CvData): CvBlock[] {
  const blocks: CvBlock[] = [];

  const name = (cv.name || "").trim();
  if (name) blocks.push({ type: "title", text: name });

  const strength = (cv.strength || "").trim();
  if (strength) {
    blocks.push({ type: "groupHeading", text: "Strength Summary" });
    blocks.push(...dropRedundantLeadHeading(parseMarkdownBlocks(strength)));
  }

  const interest = (cv.interest || "").trim();
  if (interest) {
    blocks.push({ type: "groupHeading", text: "Interest Summary" });
    blocks.push(...dropRedundantLeadHeading(parseMarkdownBlocks(interest)));
  }

  return blocks;
}

/** Clean, plain-text representation for the clipboard (no HTML, no Markdown). */
export function cvToPlainText(cv: CvData): string {
  const out: string[] = [];
  for (const b of buildCvBlocks(cv)) {
    switch (b.type) {
      case "title":
        out.push(b.text);
        break;
      case "groupHeading":
      case "sectionHeading":
        out.push("", b.text);
        break;
      case "paragraph":
        out.push(b.text);
        break;
      case "bullet":
        out.push(`• ${b.text}`);
        break;
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** `<Username>_CV.pdf`, with the name sanitised for the filesystem. */
export function cvFileName(name: string): string {
  const safe = (name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
  return `${safe || "My"}_CV.pdf`;
}

// ─── PDF rendering ────────────────────────────────────────────────────────────

// Fixed print tones (see file header note).
const INK = {
  title: [17, 24, 39] as const, // near-black
  group: [28, 152, 247] as const, // brand blue, echoes the app accent
  section: [31, 41, 55] as const, // dark slate
  body: [55, 65, 81] as const, // slate
  footer: [156, 163, 175] as const, // muted grey
};

interface WriteOpts {
  size: number;
  style: "normal" | "bold";
  color: readonly [number, number, number];
  gapBefore?: number;
  gapAfter?: number;
  indent?: number;
  bullet?: boolean;
}

/**
 * Draw the CV into an existing jsPDF document (unit: pt, A4). Handles wrapping,
 * page breaks, bullets with hanging indent, and a "Page X of Y" footer.
 */
export function drawCvPdf(doc: jsPDF, cv: CvData): void {
  const FONT = "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56; // ~0.78in
  const contentW = pageW - margin * 2;
  const bottomLimit = pageH - margin;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text: string, o: WriteOpts) => {
    const gapBefore = o.gapBefore ?? 0;
    const gapAfter = o.gapAfter ?? 0;
    const indent = o.indent ?? 0;
    const bulletGap = o.bullet ? 12 : 0;
    const lineH = o.size * 1.4;

    doc.setFont(FONT, o.style);
    doc.setFontSize(o.size);
    doc.setTextColor(o.color[0], o.color[1], o.color[2]);

    const lines = doc.splitTextToSize(
      text,
      contentW - indent - bulletGap,
    ) as string[];

    y += gapBefore;
    lines.forEach((line, i) => {
      ensureSpace(lineH);
      const x = margin + indent + bulletGap;
      if (o.bullet && i === 0) {
        doc.text("•", margin + indent, y, { baseline: "top" });
      }
      doc.text(line, x, y, { baseline: "top" });
      y += lineH;
    });
    y += gapAfter;
  };

  for (const block of buildCvBlocks(cv)) {
    switch (block.type) {
      case "title":
        write(block.text, {
          size: 22,
          style: "bold",
          color: INK.title,
          gapAfter: 6,
        });
        // Divider rule under the name.
        ensureSpace(10);
        doc.setDrawColor(INK.group[0], INK.group[1], INK.group[2]);
        doc.setLineWidth(1);
        doc.line(margin, y, pageW - margin, y);
        y += 14;
        break;
      case "groupHeading":
        write(block.text, {
          size: 13,
          style: "bold",
          color: INK.group,
          gapBefore: 16,
          gapAfter: 6,
        });
        break;
      case "sectionHeading":
        write(block.text, {
          size: 11,
          style: "bold",
          color: INK.section,
          gapBefore: 10,
          gapAfter: 4,
        });
        break;
      case "paragraph":
        write(block.text, {
          size: 10.5,
          style: "normal",
          color: INK.body,
          gapAfter: 6,
        });
        break;
      case "bullet":
        write(block.text, {
          size: 10.5,
          style: "normal",
          color: INK.body,
          gapAfter: 3,
          indent: 4,
          bullet: true,
        });
        break;
    }
  }

  // Footer page numbers — added last so the total count is known.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(INK.footer[0], INK.footer[1], INK.footer[2]);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - margin / 2, {
      align: "right",
      baseline: "bottom",
    });
  }
}
