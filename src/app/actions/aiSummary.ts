"use server";

// Gated AI-summary Server Actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes
//   ai-summary/questions    → questions    (GET — the CV-builder questions)
//   ai-summary/add-summary  → add-summary  (POST — persist the generated CV)
//
// Each returns the unchanged `{ status, code?, message?, data }` envelope; a
// logged-out caller gets `code:"UNAUTHENTICATED"` (no network hit) which the
// client maps to its login gate (never force-logout). The summary screens are
// interactive client TanStack queries, so they keep their existing query
// invalidation and are NOT revalidated here.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export interface SaveSummaryPayload {
  qa_json?: Array<{ question: string; answer: string }>;
  strengths_summary: string;
  interests_summary: string;
  ai_modal: string;
}

// The backend bodies are dynamic at the call sites (the questions modal reads
// `apiQuestions?.data?.questions`); `data` is `any` to preserve the original
// axios pass-through ergonomics — same documented exception as
// src/app/actions/feed.ts.

/** GET /api/mobile/questions — the AI CV-builder questions + system prompts. */
export async function fetchAISummaryQuestionsAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.get<any>(EP.aiQuestions, { auth: "strict" });
}

/** POST /api/mobile/add-summary — persist the generated strength/interest CV. */
export async function addAISummaryAction(payload: SaveSummaryPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.aiAddSummary, payload, { auth: "strict" });
}
