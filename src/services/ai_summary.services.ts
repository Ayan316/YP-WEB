// Migrated to strict Server Actions in src/app/actions/aiSummary.ts — this file
// no longer uses the legacy axios client (removed). The actions surface the gateway's UNAUTHENTICATED
// signal by throwing an UnauthenticatedError so call sites can open the login
// gate (never force-logout — REQUIREMENTS §5 R4).

import {
  fetchAISummaryQuestionsAction,
  addAISummaryAction,
} from "@/app/actions/aiSummary";
import { UnauthenticatedError } from "@/lib/authError";

export interface SaveSummaryPayload {
  qa_json?: Array<{ question: string; answer: string }>;
  strengths_summary: string;
  interests_summary: string;
  ai_modal: string;
}

// The action's `data` is the verbatim backend body; the questions modal reads
// `apiQuestions?.data?.questions`, so the service returns `res.data` to
// preserve that exact shape.

export const fetchAISummaryQuestions = async () => {
  const res = await fetchAISummaryQuestionsAction();
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch AI summary questions");
  }
  return res.data as {
    data: {
      questions: {
        id: string;
        question: string;
        placeholder: string;
        max_length: string;
        question_type: "strengths" | "interests";
        description?: string;
      }[];
      system_prompts: {
        strengths_generation: string;
        interests_generation: string;
      };
    };
  };
};

export const addAISummary = async (payload: SaveSummaryPayload) => {
  const res = await addAISummaryAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to add AI summary");
  }
  return res.data;
};
