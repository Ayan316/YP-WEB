// src/services/options.services.ts
//
// Public "all options" lookups — fully migrated to Server Actions in
// src/app/actions/options.ts. No longer imports the legacy axios client (removed). Each function
// returns the verbatim backend body (the action's envelope `data`); callers
// read `data?.data?.skills` / `.location` / `.institutions`.

import {
  fetchSkillsAction,
  fetchLocationsAction,
  fetchInstitutionsAction,
} from "@/app/actions/options";

export const fetchLocations = async () => {
  const res = await fetchLocationsAction();
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch locations");
  }
  return res.data;
};

export const fetchInstitutions = async () => {
  const res = await fetchInstitutionsAction();
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch institutions");
  }
  return res.data;
};

export const fetchSkills = async () => {
  const res = await fetchSkillsAction();
  if (res.status !== "OK") {
    throw new Error(res.message || "Failed to fetch skills");
  }
  return res.data;
};
