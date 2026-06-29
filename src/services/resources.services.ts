// src/services/resources.services.ts
//
// Public Resources reads — fully migrated to Server Actions in
// src/app/actions/resources.ts. This file no longer imports the legacy axios client (removed).
// Each function returns the verbatim backend body (the action's envelope
// `data`), so the call sites keep reading `.status === "OK"` and `.data.result`
// / `.data` exactly as before.

import {
  getResourceCategoriesAction,
  getResourcesAction,
  getResourceDetailAction,
} from "@/app/actions/resources";

export interface GetResourcesPayload {
  category?: string;
  search?: string;
  sort_by?: string; // "a_to_z" | "z_to_a" | omit for recently-added (default)
  page?: number;
  limit?: number;
}

export interface GetResourceDetailPayload {
  id: string;
}

export const getResourceCategories = async () => {
  const res = await getResourceCategoriesAction();
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch resource categories");
  }
  return res.data;
};

export const getResources = async (payload: GetResourcesPayload) => {
  const res = await getResourcesAction(payload);
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch resources");
  }
  return res.data;
};

export const getResourceDetail = async (payload: GetResourceDetailPayload) => {
  const res = await getResourceDetailAction({ id: payload.id });
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch resource detail");
  }
  return res.data;
};
