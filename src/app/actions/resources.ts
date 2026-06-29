"use server";

// Read Server Actions for the public Resources domain (REQUIREMENTS §4.4).
//
// Replaces `src/app/api/resources/{categories,list,detail}` proxy routes. Soft
// auth (resources are browseable anonymously). The detail endpoint increments
// view_count server-side, so it is only ever called from the detail page.

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

export interface GetResourcesPayload {
  category?: string;
  search?: string;
  sort_by?: string; // "a_to_z" | "z_to_a" | omit for recently-added (default)
  page?: number;
  limit?: number;
}

// These endpoints return verbatim backend bodies; the service returns `res.data`
// and the call sites read `.data.result` | `.data`. `data` is `any` to preserve
// the original axios pass-through ergonomics — same documented exception as
// src/app/actions/feed.ts.

/** POST /api/web/resources/categories — category chips for the sidebar. */
export async function getResourceCategoriesAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.resourcesCats, {}, { auth: "soft" });
}

/** POST /api/web/resources/list — paginated resources (search + category). */
export async function getResourcesAction(payload: GetResourcesPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.resourcesList, payload, { auth: "soft" });
}

/** POST /api/web/resources/detail — a single resource (increments view_count). */
export async function getResourceDetailAction(payload: { id: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.post<any>(EP.resourceDetail, { id: payload.id }, { auth: "soft" });
}
