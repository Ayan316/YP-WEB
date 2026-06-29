// src/helpers/careerStatus.ts
// Shared career-status helper used by onboarding and profile flows.
// Single source of truth for the Branch A (education) vs Branch B (contextual)
// split driven by the user's career_status selection.

import careerStatusData from "@/data/career_status.json";

export interface CareerStatusOption {
  id: number;
  name: string;
}

// Some JSON shapes vary across the codebase; normalize defensively.
const rawList: any =
  (careerStatusData as any)?.career_status_choices ??
  (careerStatusData as any) ??
  [];

export const CAREER_STATUS_OPTIONS: CareerStatusOption[] = Array.isArray(rawList)
  ? (rawList as CareerStatusOption[])
  : [];

// Branch A — formal education in progress
const EDUCATION_STATUSES = new Set<string>([
  "At school / college",
  "At university",
]);

// Course id allow-lists per career status (matches src/data/courses.json)
// 1-4: school/college years, 6-9: university years
const SCHOOL_COURSE_IDS = new Set<number>([1, 2, 3, 4]);
const UNIVERSITY_COURSE_IDS = new Set<number>([6, 7, 8, 9]);
const CONTEXTUAL_COURSE_IDS = new Set<number>([1, 2, 3, 4, 6, 7, 8, 9]);

export function getAllowedCourseIds(status: string): Set<number> | null {
  if (!status) return null;
  const trimmed = status.trim();
  if (trimmed === "At school / college") return SCHOOL_COURSE_IDS;
  if (trimmed === "At university") return UNIVERSITY_COURSE_IDS;
  if (
    trimmed === "Taking a gap year" ||
    trimmed === "Finished education and actively looking for work"
  ) {
    return CONTEXTUAL_COURSE_IDS;
  }
  return null;
}

export function isEducationStatus(status: string): boolean {
  if (!status) return false;
  return EDUCATION_STATUSES.has(status.trim());
}

export function isContextualStatus(status: string): boolean {
  if (!status || !status.trim()) return false;
  return !EDUCATION_STATUSES.has(status.trim());
}

// Backend expects the numeric ID (as a string) rather than the label.
// Given the user-facing name (e.g. "In school"), return the matching id
// from career_status.json as a string (e.g. "0"). Falls back to the
// original name if no match is found, so the caller still has a value
// to send while the mismatch is investigated.
export function getCareerStatusId(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  const match = CAREER_STATUS_OPTIONS.find((o) => o.name === trimmed);
  return match ? String(match.id) : trimmed;
}

// Inverse: given an id (number or string), return the user-facing name.
// Useful when hydrating a form from a backend response that stores the id.
export function getCareerStatusNameById(id: string | number | null | undefined): string {
  if (id === null || id === undefined || id === "") return "";
  const idNum = typeof id === "number" ? id : Number(id);
  const match = CAREER_STATUS_OPTIONS.find((o) => o.id === idNum);
  return match ? match.name : String(id);
}
