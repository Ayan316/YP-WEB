// fetchJobs.ts - simplified
//
// NOTE: every read AND write in this file is now migrated to the server gateway
// via Server Actions in src/app/actions/jobs.ts — this file no longer imports
// the legacy axios client (removed). The strict writes / account reads (save/unsave/apply, saved/
// recommended/applied lists) surface the gateway's UNAUTHENTICATED signal by
// throwing an UnauthenticatedError so call sites can open the login gate
// (never force-logout — REQUIREMENTS §5 R4).
import {
  fetchJobsAction,
  fetchJobDetailsAction,
  fetchSimilarJobsAction,
  fetchCompanyJobsAction,
  fetchFilterListAction,
  saveJobAction,
  unsaveJobAction,
  applyJobAction,
  fetchAppliedJobsAction,
  fetchSavedJobsAction,
  fetchRecomendedJobsAction,
} from "@/app/actions/jobs";
import { UnauthenticatedError } from "@/lib/authError";

export interface FetchJobsPayload {
  limit?: number;
  page?: number;
  search_text?: string;
  company_id?: string; // comma-separated company ids: "1, 2, 3"
  job_sector?: string; // comma-separated: "IT, Finance, HR"
  job_sector_id?: string; // comma-separated job sector ids: "1, 2, 3"
  employment_type?: string; // comma-separated: "Full-time, Part-time"
  job_location?: string; // comma-separated: "Kolkata, Pune, UK"
  id?: string;
  sort_by?: string;
}

// Company Jobs API interfaces and service
export interface CompanyJobsPayload {
  limit: number;
  page: number;
  id: string;
}

export interface CompanyJobsResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

// Helper function to convert array to comma-separated string
const arrayToCommaSeparatedString = (arr: string[]): string | undefined => {
  if (!arr || arr.length === 0) return undefined;
  return arr.join(", ");
};

export const fetchJobs = async (payload: FetchJobsPayload) => {
  // Migrated to Server Action (soft auth → anonymous-friendly). The action's
  // envelope `data` is the verbatim backend body the old proxy returned, so the
  // call sites that read `page.data.result` / `lastPage.data.total_count` are
  // unchanged.
  const res = await fetchJobsAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch jobs");
  }
  return res.data;
};

// Migrated to a strict Server Action. The old proxy returned the backend body
// (verbatim or wrapped as { status, data }) and this service returned
// `res.data?.data`; the action returns { status, data: <backendBody> }, so
// `(res.data as any)?.data` preserves the exact shape the callers consume.
export const fetchRecomendedJobs = async (payload: FetchJobsPayload) => {
  const res = await fetchRecomendedJobsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch recomended jobs");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const fetchSavedJobs = async (payload: FetchJobsPayload) => {
  const res = await fetchSavedJobsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch saved jobs");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const saveJob = async (payload: FetchJobsPayload) => {
  const res = await saveJobAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to save job");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const unsaveJob = async (payload: FetchJobsPayload) => {
  const res = await unsaveJobAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to unsave job");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const applyJob = async (payload: FetchJobsPayload) => {
  const res = await applyJobAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to apply for job");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const fetchAppliedJobs = async (payload: FetchJobsPayload) => {
  const res = await fetchAppliedJobsAction(payload);
  if (res.status !== "OK") {
    if (res.code === "UNAUTHENTICATED") throw new UnauthenticatedError(res.message);
    throw new Error(res.message || "Failed to fetch applied jobs");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.data;
};

export const fetchJobDetails = async (payload: FetchJobsPayload) => {
  // Migrated to Server Action. The old proxy wrapped the backend body as
  // { status: "OK", data: <backendBody> } and this service returned `.data.data`
  // (= the backend body). The action returns { status, data: <backendBody> },
  // so returning `res.data` preserves the exact `job?.data?.…` shape callers use.
  const res = await fetchJobDetailsAction({ id: payload.id as string });
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch job details");
  }
  return res.data;
};

// FilterList API interfaces and service
export interface FilterListResponse {
  data: {
    job_location: any;
    company: Array<{
      id: string;
      name: string;
    }>;
    jobsector: Array<{
      id: string;
      name: string;
    }>;
    employment_type: Array<{
      name: string;
      label: string;
    }>;
    industry: Array<{
      id: string;
      name: string;
    }>;
  };
}

export const fetchFilterList = async () => {
  // Migrated to Server Action (GET /api/web/user/search-filters, soft auth).
  // The backend body is the FilterListResponse `{ data: { … } }`; callers read
  // `filterListData?.data?.company` etc., so we return the backend body.
  const res = await fetchFilterListAction();
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch filter list");
  }
  return res.data as FilterListResponse;
};

export const fetchCompanyJobs = async (payload: CompanyJobsPayload) => {
  // Migrated to Server Action. The old proxy normalised the backend body into
  // { jobs, count, total_count, message } and this service returned that object;
  // callers read `companyJobsData?.jobs` / `.count`. We reproduce the same
  // normalisation here from the verbatim backend body the action returns.
  const res = await fetchCompanyJobsAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch company jobs");
  }
  const backend = (res.data ?? {}) as any;
  return {
    jobs: backend?.data?.result || [],
    count: backend?.data?.count || 0,
    total_count: backend?.data?.total_count || 0,
    message: backend?.message || "Success",
  };
};



export const fetchSimilarJobs = async (payload: CompanyJobsPayload) => {
  // Migrated to Server Action. Same normalisation as fetchCompanyJobs: callers
  // (JobDetails "Similar Jobs" rail) read `companyJobsData?.jobs`.
  const res = await fetchSimilarJobsAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch similar jobs");
  }
  const backend = (res.data ?? {}) as any;
  return {
    jobs: backend?.data?.result || [],
    count: backend?.data?.count || 0,
    total_count: backend?.data?.total_count || 0,
    message: backend?.message || "Success",
  };
};




export { arrayToCommaSeparatedString };
