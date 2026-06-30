"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Sparkles, Check, X, Zap, Heart } from "lucide-react";
import styles from "../../moduleCss/profile.module.css";
import SummaryGeneratorModal from "./AISummery/SummeryGenerationModal";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { toast } from "react-toastify";
import { addAISummary } from "@/services/ai_summary.services";
import styles_ai from "../../moduleCss/ai_summary.module.css";
import ConfirmModal from "@/components/commonUI/ConfirmModal";
import { useTheme } from "@/context/ThemeContext";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";
import CVActions from "./cv/CVActions";
import type { CvData } from "./cv/pdfFormatter";

// ─── Strip Markdown for Editing ──────────────────────────────────────────────

function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return line.slice(3);
      if (line.startsWith("### ")) return line.slice(4);
      if (line.startsWith("# ")) return line.slice(2);
      if (line.startsWith("• ") || line.startsWith("\u2022 "))
        return line.replace(/^[•\u2022]\s*/, "- ");
      return line;
    })
    .join("\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderInlineMd(
  text: string,
  accentColor: string,
  isLight: boolean,
): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ color: accentColor, fontWeight: 600 }}>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function normalizeMd(text: string): string {
  // Drop trailing empty "SKILLS:" / "SUMMARY:" section labels: the AI output
  // sometimes emits the label with no content under it, which renders as a
  // bare heading at the bottom of the card.
  const isSectionLabel = (s: string) =>
    /^(SKILLS|SUMMARY):?\s*$/.test(s.trim());
  const isFiller = (s: string) =>
    s.trim() === "" || /^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(s);

  const rawLines = text.split("\n");
  // Walk from the end, drop label lines that have no real content after them.
  let endIdx = rawLines.length;
  while (endIdx > 0) {
    const last = rawLines[endIdx - 1];
    if (isFiller(last)) {
      endIdx--;
      continue;
    }
    if (isSectionLabel(last)) {
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
    // "## Heading — inline content" → split
    if (trimmed.startsWith("## ")) {
      const m = trimmed.match(/^(##\s+.+?)\s*[—–]\s*(.+)$/);
      if (m) {
        out.push(m[1].trim());
        if (m[2].trim()) out.push(m[2].trim());
        i++;
        continue;
      }
    }
    // Orphan bullet → combine with next line
    if (/^[•·●]\s*$/.test(trimmed) && i + 1 < lines.length) {
      out.push(`- ${lines[i + 1].trim()}`);
      i += 2;
      continue;
    }
    // Title-case section without ## (e.g. "Key Skills")
    if (/^([A-Z][a-z]+ ){1,4}[A-Z][a-z]+$/.test(trimmed)) {
      out.push(`## ${trimmed}`);
      i++;
      continue;
    }
    // "Section Name —" with trailing dash
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

function renderMarkdown(text: string, accentColor: string, isLight = false) {
  if (!text)
    return (
      <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
        Build Your Profile Summary with Dan AI
      </p>
    );
  const textColor = isLight ? "#888888" : "#94a3b8";
  const bodyColor = isLight ? "#888888" : "#cbd5e1";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {normalizeMd(text)
        .split("\n")
        .map((line, i) => {
          // SKILLS: / SUMMARY: section label
          if (/^(SKILLS|SUMMARY):?\s*$/.test(line.trim())) {
            return (
              <div
                key={i}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.5)",
                  marginTop: i === 0 ? 0 : "14px",
                  marginBottom: "2px",
                  paddingBottom: "4px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {line.trim().replace(/:$/, "")}
              </div>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <div
                key={i}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "capitalize",
                  color: accentColor,
                  marginTop: i === 0 ? 0 : "10px",
                  marginBottom: "3px",
                }}
              >
                {renderInlineMd(line.slice(3), accentColor, isLight)}
              </div>
            );
          }
          // Dash or star bullets
          if (/^[-*]\s+/.test(line) || /^[•·●\u2022]\s+/.test(line)) {
            const content = line.replace(/^[-*•·●\u2022]\s+/, "");
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    marginTop: "7px",
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: accentColor,
                    opacity: 0.85,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.65",
                    color: bodyColor,
                  }}
                >
                  {renderInlineMd(content, accentColor, isLight)}
                </span>
              </div>
            );
          }
          if (line.trim() === "")
            return <div key={i} style={{ height: "4px" }} />;
          // Markdown horizontal rules (---, ___, ***) — AI output sometimes
          // tails these on; render nothing so they don't show as literal "---".
          if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line))
            return null;
          return (
            <div
              key={i}
              style={{ fontSize: "13px", lineHeight: "1.7", color: textColor }}
            >
              {renderInlineMd(line, accentColor, isLight)}
            </div>
          );
        })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SummaryCard() {
  const { data: profileQueryData } = useUserProfile();
  const raw = profileQueryData?.data;

  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();

  const userName: string = raw?.first_name ?? "";

  const modalProfileData = {
    name:
      [raw?.first_name, raw?.last_name].filter(Boolean).join(" ") ||
      raw?.full_name ||
      "",
    location: raw?.location ?? undefined,
    education: [raw?.college, raw?.study_field].filter(Boolean) as string[],
    existingSkills: Array.isArray(raw?.skills) ? raw.skills : [],
  };

  const [showModal, setShowModal] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Auto-open the generation modal when the user is routed here from the
  // pre-apply gate (useApplyGate) via `?openSummary=1`. After triggering, the
  // param is stripped so refresh doesn't re-trigger.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (searchParams?.get("openSummary") === "1") {
      autoOpenedRef.current = true;
      setShowModal(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openSummary");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const [strength, setSummary] = useState("");
  const [interest, setInterest] = useState("");
  // Tracks whether the user generated a summary this session (before the
  // React Query cache has been refreshed). Prevents stale `raw` from wiping
  // the locally-generated content on re-renders (e.g. theme change).
  const localGenerationRef = useRef(false);

  // Hydrate from the React Query profile response — the API is the only
  // source of truth. We deliberately do not persist to localStorage.
  useEffect(() => {
    if (raw?.strengths_summary || raw?.interests_summary) {
      setSummary(raw.strengths_summary ?? "");
      setInterest(raw.interests_summary ?? "");
      localGenerationRef.current = false;
      return;
    }
    if (raw !== undefined && !localGenerationRef.current) {
      setSummary("");
      setInterest("");
    }
  }, [raw]);

  // One-time cleanup of any legacy localStorage value left over from older
  // builds. Safe to delete this effect after a release or two.
  useEffect(() => {
    try {
      localStorage.removeItem("yp_ai_profile");
    } catch {
      /* ignore */
    }
  }, []);

  const handleSummaryGenerated = (data: {
    strength: string;
    interest: string;
  }) => {
    localGenerationRef.current = true;
    setSummary(data.strength);
    setInterest(data.interest);
    toast.success("Strength & Interest generated!");
  };

  const handleSummarySave = async (val: string) => {
    ensureAuthed("generate your AI summary", async () => {
      setSummary(val);
      try {
        await addAISummary({
          strengths_summary: val,
          interests_summary: interest,
          ai_modal: "llama-3.3-70b-versatile",
        });
      } catch (err) {
        if (isUnauthenticatedError(err)) {
          openGate("generate your AI summary");
          return;
        }
        console.error("[addAISummary] Failed to save strength:", err);
      }
      toast.success("Strength updated!");
    });
  };

  const handleInterestSave = async (val: string) => {
    ensureAuthed("generate your AI summary", async () => {
      setInterest(val);
      try {
        await addAISummary({
          qa_json: [],
          strengths_summary: strength,
          interests_summary: val,
          ai_modal: "llama-3.3-70b-versatile",
        });
      } catch (err) {
        if (isUnauthenticatedError(err)) {
          openGate("generate your AI summary");
          return;
        }
        console.error("[addAISummary] Failed to save interest:", err);
      }
      toast.success("Interest updated!");
    });
  };

  const hasContent = !!(strength || interest);

  const cv: CvData = {
    name: modalProfileData.name || userName,
    strength,
    interest,
  };

  return (
    <>
      <div className="mt-4">
        <div className="card_custom" style={{ minHeight: "unset" }}>
          <div className={styles.profileInfo}>
            {/* ── Header ── */}
            <div
              className={styles.nameWrapper}
              style={{ marginBottom: hasContent ? "16px" : "0" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h2 className={styles.section_title} style={{ margin: 0 }}>
                  Profile Summary
                </h2>
              </div>

              <CVActions
                cv={cv}
                hasContent={hasContent}
                onRegenerate={() =>
                  ensureAuthed("generate your AI summary", () =>
                    hasContent
                      ? setShowRegenerateConfirm(true)
                      : setShowModal(true),
                  )
                }
              />
            </div>

            {/* ── Content ── */}
            {hasContent ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <InlineField
                  label="Strength"
                  accentColor="#3b82f6"
                  accentBorder="rgba(59,130,246,0.25)"
                  accentBg="rgba(59,130,246,0.04)"
                  value={strength}
                  onSave={handleSummarySave}
                />
                <InlineField
                  label="Interest"
                  accentColor="#8b5cf6"
                  accentBorder="rgba(139,92,246,0.25)"
                  accentBg="rgba(139,92,246,0.04)"
                  value={interest}
                  onSave={handleInterestSave}
                />
              </div>
            ) : (
              <EmptyState
                onGenerate={() =>
                  ensureAuthed("generate your AI summary", () =>
                    setShowModal(true),
                  )
                }
              />
            )}
          </div>
        </div>
      </div>

      <SummaryGeneratorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSummaryGenerated={handleSummaryGenerated}
        userName={userName}
        profileData={modalProfileData}
        hasExistingSummary={hasContent}
      />

      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          setShowModal(true);
        }}
        title="Regenerate Profile Summary with Dan AI?"
        message="This will restart all 10 questions. Continue?"
        confirmText="Continue"
        cancelText="Cancel"
      />

      {authGateModal}
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
    const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  return (
    <div
      style={{
        marginTop: "12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(99,179,255,0.15)",
        borderRadius: "14px",
        padding: "24px 20px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: `${isLight ? "#A0AEC0" : "#fff" }`,
          marginBottom: "6px",
        }}
      >
        Build Your Profile Summary with Dan AI
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "#A0AEC0",
          lineHeight: "1.5",
          marginBottom: "16px",
        }}
      >
        Answer 10 quick questions and let Dan AI craft your
        <br />
        professional profile summary.
      </p>
      <button
        onClick={onGenerate}
        className="btn-gradient"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12.5px",
          padding: "8px 20px",
          borderRadius: "20px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {/* <Sparkles size={13} /> */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20px"
          height="20px"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="m21.45 11.11l-3-1.5l-2.7-1.35l-1.35-2.7l-1.5-3c-.34-.68-1.45-.68-1.79 0l-1.5 3l-1.35 2.7l-2.7 1.35l-3 1.5c-.34.17-.55.52-.55.89s.21.72.55.89l3 1.5l2.7 1.35l1.35 2.7l1.5 3c.17.34.52.55.89.55s.73-.21.89-.55l1.5-3l1.35-2.7l2.7-1.35l3-1.5c.34-.17.55-.52.55-.89s-.21-.72-.55-.89Zm-3.89 1.5l-.84.42l-2.16 1.08l-.3.15l-.15.3L12 18.77l-2.11-4.21l-.15-.3l-.3-.15l-2.16-1.08l-.84-.42L5.23 12l1.21-.61l.84-.42l2.16-1.08l.3-.15l.15-.3L12 5.23l2.11 4.21l.15.3l.3.15l2.16 1.08l.84.42l1.21.61zM19.5 1.5l-.94 2.06l-2.06.94l2.06.94l.94 2.06l.94-2.06l2.06-.94l-2.06-.94z"
          ></path>
        </svg>
        Get Started
      </button>
    </div>
  );
}

// ─── Inline Field ─────────────────────────────────────────────────────────────

function InlineField({
  label,
  accentColor,
  accentBg,
  accentBorder,
  value,
  onSave,
}: {
  label: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  value: string;
  onSave: (val: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft(stripMarkdown(value));
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  return (
    <div
      style={{
        background: accentBg,
        border: `1px solid ${editing ? accentColor : accentBorder}`,
        borderRadius: "14px",
        padding: "14px 16px",
        transition: "border-color 0.2s",
      }}
    >
      {/* ── Label row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.07em",
            color: accentColor,
            textTransform: "capitalize",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            margin: 0,
          }}
        >
          {label === "Strength" ? <Zap size={13} /> : <Heart size={13} />}
          {label}
        </p>

        {!editing && (
          <button
            onClick={startEdit}
            title={`Edit ${label}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "14px",
              padding: "4px 11px",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={16}
              height={16}
              viewBox="0 0 27 27"
              fill="none"
            >
              <path
                d="M7.875 19.125V14.625L19.125 3.375L23.625 7.875L12.375 19.125H7.875Z"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.375 23.625H23.625"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.75 6.75L20.25 11.25"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            style={{
              width: "100%",
              background: isLight ? "transparent" : "rgba(0,0,0,0.2)",
              border: `1px solid ${accentColor}`,
              borderRadius: "10px",
              padding: "10px 12px",
              color: isLight ? "#333" : "#e2e8f0",
              fontSize: "13px",
              lineHeight: "1.7",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />

          {/* Char count + actions */}
          <div className={styles_ai.actionsWrapper}>
            <div className={styles_ai.actions}>
              <button
                onClick={cancel}
                className={
                  isLight ? styles_ai.cancelBtnLight : styles_ai.cancelBtn
                }
              >
                <X size={11} /> Cancel
              </button>

              <button
                onClick={save}
                disabled={!draft.trim()}
                className={
                  isLight
                    ? styles_ai.saveBtnLight
                    : `${styles_ai.saveBtn} ${
                        label === "Strength"
                          ? styles_ai.saveBtnStrength
                          : styles_ai.saveBtnDefault
                      }`
                }
              >
                <Check size={11} /> Save
              </button>
            </div>
          </div>
        </>
      ) : (
        renderMarkdown(value, accentColor, isLight)
      )}
    </div>
  );
}
