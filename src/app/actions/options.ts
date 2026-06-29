"use server";

// Read Server Actions for the public "all options" lookups (REQUIREMENTS §4.4).
//
// Replaces `src/app/api/alloptions/{skills,locations,institutions}` proxy
// routes. These are GET endpoints on the web API; soft auth (the lists are
// public reference data used in onboarding + profile editing).

import { api } from "@/lib/api";
import { EP } from "@/lib/endpoints";

// These lookups return verbatim backend bodies (dynamic shape); the service
// returns `res.data` and the call sites read `data?.data?.skills` | `.location`
// | `.institutions`. `data` is `any` to preserve the original axios pass-through
// ergonomics — same documented exception as src/app/actions/feed.ts.

/** GET /api/web/skills — skills lookup list. */
export async function fetchSkillsAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.get<any>(EP.skills, { auth: "soft" });
}

/** GET /api/web/user-locations — locations lookup list. */
export async function fetchLocationsAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.get<any>(EP.locations, { auth: "soft" });
}

/** GET /api/web/institutions — institutions lookup list. */
export async function fetchInstitutionsAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api.get<any>(EP.institutions, { auth: "soft" });
}
