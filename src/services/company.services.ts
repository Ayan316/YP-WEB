"use client"
// NOTE: every read AND write here is now migrated to Server Actions in
// src/app/actions/companies.ts — this file no longer uses axios. followCompany
// surfaces the gateway's UNAUTHENTICATED signal by throwing an
// UnauthenticatedError so the call site opens the login gate (never
// force-logout — REQUIREMENTS §5 R4).
import {
  fetchCompanyDetailsAction,
  fetchCompaniesListAction,
  followCompanyAction,
  fetchFollowingsAction,
} from "@/app/actions/companies";
import { UnauthenticatedError } from "@/lib/authError";


export interface CompanyJobsPayload {
  id: string;
 
}

export interface CompanyFollowPayload {
  company_id: string;
}

export interface CompanyJobsResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface CompanyListPayload {
  limit?: number;
  page?: number;
  search_text?: string;
  industry_id?: string;
  sort_by?: string;
}

export const fetchCompanyDetails = async (payload: CompanyJobsPayload) => {
  // Migrated to Server Action. The old proxy wrapped the backend body as
  // { status: "OK", data: <backendBody> } and this service returned `.data.data`
  // (= the backend body). The action returns { status, data: <backendBody> }, so
  // `res.data` preserves the `companyDetails?.data?.…` shape callers consume.
  const res = await fetchCompanyDetailsAction({ id: payload.id });
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch company details");
  }
  return res.data;
};


export const followCompany = async (payload: CompanyFollowPayload) => {
  // Migrated to a strict Server Action. The old proxy wrapped the backend body
  // as { status, data } and this service returned `res.data?.data`; the action
  // returns { status, data: <backendBody> }, so `(res.data as any)?.data`
  // preserves the shape callers consume.
  const res = await followCompanyAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to follow company");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};


export interface FollowingsPayload {
  page?: number;
  limit?: number;
  job_sector?: string;
}

export const fetchFollowings = async (payload: FollowingsPayload) => {
  // Migrated to a strict Server Action. The old proxy returned the backend body
  // directly and this service returned `res.data?.data`; the action returns
  // { status, data: <backendBody> }, so `(res.data as any)?.data` is unchanged.
  const res = await fetchFollowingsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch followings");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const fetchCompaniesList = async (payload: CompanyListPayload) => {
  // Migrated to Server Action. The old proxy returned the backend body verbatim
  // and this service returned `.data.data`; callers read `page?.result` /
  // `lastPage?.total_count`. The action returns { status, data: <backendBody> },
  // so `res.data?.data` yields the same `{ result, total_count }` object.
  const res = await fetchCompaniesListAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch companies list");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};