"use server";

// Read Server Actions for the public Jobs domain (REQUIREMENTS §4.4).
//
// These replace the old `src/app/api/{fetchjobs,fetch-jobdetails,similar-jobs,
// company-jobs,filter-list}` proxy routes. Every call uses `auth: "soft"` so
// anonymous browsing works (never 401 — REQUIREMENTS §5 R4) while a logged-in
// user gets the richer, personalised payload (saved/applied flags).
//
// The returned envelope is `{ status, code?, message?, data }` from api.* where
// `data` is the verbatim backend body — exactly the shape the existing services
// already pass through to the TanStack Query call sites. The backend web read
// endpoints take a POST JSON body (jobs/job/similar/company-jobs) or a GET
// (search-filters); we mirror that here.

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export interface FetchJobsPayload {
  limit?: number;
  page?: number;
  search_text?: string;
  company_id?: string;
  job_sector?: string;
  job_sector_id?: string;
  employment_type?: string;
  job_location?: string;
  id?: string;
  sort_by?: string;
}

export interface CompanyJobsPayload {
  limit: number;
  page: number;
  id: string;
}

// The backend web read endpoints return verbatim bodies whose shape is dynamic
// (the services normalise `.data.result`/`.count` themselves). `data` is typed
// `any` so those pass-through call sites keep their original axios ergonomics —
// same documented exception as src/app/actions/feed.ts.

/** POST /api/web/jobs — public job listing (infinite scroll, search, filters). */
export async function fetchJobsAction(payload: FetchJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.jobsList, payload, { auth: "soft" });
}

/** POST /api/web/job — public job detail by masked id. */
export async function fetchJobDetailsAction(payload: { id: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.jobDetail, { id: payload.id }, { auth: "soft" });
}

/** POST /api/web/company/similar-jobs — "Similar Jobs" rail on a job detail. */
export async function fetchSimilarJobsAction(payload: CompanyJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.similarJobs, payload, { auth: "soft" });
}

/** POST /api/web/company/jobs-list — jobs listed under a company. */
export async function fetchCompanyJobsAction(payload: CompanyJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.companyJobs, payload, { auth: "soft" });
}

/** GET /api/web/user/search-filters — filter chips (company/sector/etc.). */
export async function fetchFilterListAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.get<any>(EP.filterList, { auth: "soft" });
}

// ---------------------------------------------------------------------------
// Gated write / account-read actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// These replace the old strict proxy routes
//   save_job, unsave_job, applied-job, applied-jobs-list, fetch_saved_jobs,
//   fetch_recomended_jobs.
// Each returns the unchanged `{ status, code?, message?, data }` envelope; when
// the user is logged out api.* short-circuits to `code:"UNAUTHENTICATED"` (no
// network hit) — the client maps that to its login gate (never force-logout).
//
// After a successful save/unsave/apply we revalidate the server-rendered job
// surfaces; the personalised lists (saved/recommended/applied) are read from
// interactive client TanStack queries, so they keep their existing query
// invalidation and are NOT revalidated here.
// ---------------------------------------------------------------------------

export type SaveJobPayload = FetchJobsPayload & { id?: string };

/** POST /api/mobile/user/save-job — save a job for the logged-in user. */
export async function saveJobAction(payload: SaveJobPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.saveJob, payload, { auth: "strict" });
  if (res.status === "OK") {
    revalidatePath("/jobs");
  }
  return res;
}

/** POST /api/mobile/user/remove-job — remove a saved job. */
export async function unsaveJobAction(payload: SaveJobPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.unsaveJob, payload, { auth: "strict" });
  if (res.status === "OK") {
    revalidatePath("/jobs");
  }
  return res;
}

/** POST /api/mobile/user/applied-jobs — mark a job as applied. */
export async function applyJobAction(payload: SaveJobPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.appliedJob, payload, { auth: "strict" });
  if (res.status === "OK") {
    revalidatePath("/jobs");
  }
  return res;
}

/** POST /api/mobile/user/applied-jobs-list — the user's applied-jobs list. */
export async function fetchAppliedJobsAction(payload: FetchJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.appliedJobsList, payload, { auth: "strict" });
  console.log("[fetchAppliedJobsAction] payload:", payload);
  console.log("[fetchAppliedJobsAction] response:", JSON.stringify(res, null, 2));
  return res;
}

/** POST /api/mobile/user/saved-jobs — the user's saved-jobs list. */
export async function fetchSavedJobsAction(payload: FetchJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.savedJobs, payload, { auth: "strict" });
  console.log("[fetchSavedJobsAction] payload:", payload);
  console.log("[fetchSavedJobsAction] response:", JSON.stringify(res, null, 2));
  return res;
}

/** POST /api/web/user/recommended-jobs — recommendations. Soft auth so logged-out
 *  visitors get generic recommendations (never 401), while a signed-in user gets
 *  the personalised payload. */
export async function fetchRecomendedJobsAction(payload: FetchJobsPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.recommendedJobs, payload, { auth: "soft" });
  console.log("[fetchRecomendedJobsAction] payload:", payload);
  console.log("[fetchRecomendedJobsAction] response:", JSON.stringify(res, null, 2));
  return res;
}
