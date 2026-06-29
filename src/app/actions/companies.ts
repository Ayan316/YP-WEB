"use server";

// Read Server Actions for the public Companies domain (REQUIREMENTS §4.4).
//
// Replaces `src/app/api/{companies-list,company-details}` proxy routes. Soft
// auth: anonymous visitors can browse the companies list + a company's detail
// page; logged-in users additionally get `follow_status`.

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export interface CompanyListPayload {
  limit?: number;
  page?: number;
  search_text?: string;
  industry_id?: string;
  job_sector?: string;
  sort_by?: string;
}

/** POST /api/web/companies — public companies listing (infinite scroll). */
export async function fetchCompaniesListAction(payload: CompanyListPayload) {
  // Mirror the old proxy's pagination defaults so the call site behaves
  // identically when page/limit are omitted.
  const body: Record<string, unknown> = {
    page: payload?.page ?? 1,
    limit: payload?.limit ?? 10,
    search_text: payload?.search_text,
    industry_id: payload?.industry_id,
  };
  if (payload?.job_sector) body.job_sector = payload.job_sector;
  if (payload?.sort_by) body.sort_by = payload.sort_by;

  // Verbatim backend body (dynamic shape); the service reads `res.data?.data`.
  // `data` is `any` to preserve the original axios pass-through ergonomics —
  // same documented exception as src/app/actions/feed.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.companiesList, body, { auth: "soft" });
}

/** POST /api/web/company-details — public company detail by masked id. */
export async function fetchCompanyDetailsAction(payload: { id: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.companyDetail, { id: payload.id }, { auth: "soft" });
}

// ---------------------------------------------------------------------------
// Gated company actions (auth:"strict" — REQUIREMENTS §4.3/§4.4).
//
// Replace the old strict proxy routes follow-company + followings. The follow
// toggle revalidates the server-rendered companies surfaces on success; the
// followings list is read from an interactive client TanStack query, so it
// keeps its existing query invalidation and is not revalidated here.
// ---------------------------------------------------------------------------

export interface CompanyFollowPayload {
  company_id: string;
}

export interface FollowingsPayload {
  page?: number;
  limit?: number;
  job_sector?: string;
}

/** POST /api/mobile/company/follow — follow / unfollow a company. */
export async function followCompanyAction(payload: CompanyFollowPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<any>(EP.followCompany, payload, {
    auth: "strict",
  });
  if (res.status === "OK") {
    revalidatePath("/companies");
  }
  return res;
}

/** POST /api/mobile/user/followings — companies the user follows (paginated). */
export async function fetchFollowingsAction(payload: FollowingsPayload) {
  const body: Record<string, unknown> = {
    page: payload?.page ?? 1,
    limit: payload?.limit ?? 10,
  };
  if (payload?.job_sector) body.job_sector = payload.job_sector;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.followings, body, { auth: "strict" });
}
