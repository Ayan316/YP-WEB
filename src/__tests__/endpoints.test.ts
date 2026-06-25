import { describe, it, expect } from "vitest";
import { EP, type EndpointKey } from "@/lib/endpoints";

// Endpoint catalog contract (src/lib/endpoints.ts).
//
// These guards encode the migration rules documented at the top of endpoints.ts:
//   - public reads  -> /api/web/*   (soft/none auth)
//   - gated writes  -> /api/mobile/* (strict auth)
//   - no "(confirm)" residue from REQUIREMENTS §4.5
//   - every value a non-empty path string

// Account/write paths that MUST be present and gated behind strict auth.
const GATED_KEYS: EndpointKey[] = [
  "saveJob",
  "unsaveJob",
  "sendMessage",
  "profileData",
  "savedJobs",
  "followCompany",
  "addComment",
  "blockUser",
  "notifications",
  "createProfile",
  "updateProfile",
  "eventConfirmPayment",
];

// Public browse/detail paths that MUST be present and live under the web API.
const READ_KEYS: EndpointKey[] = [
  "jobsList",
  "jobDetail",
  "eventsList",
  "eventDetails",
  "resourcesList",
  "resourcesCats",
  "companiesList",
  "feed",
  "skills",
  "locations",
];

describe("endpoints — catalog shape", () => {
  it("every value is a non-empty string", () => {
    const entries = Object.entries(EP);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(typeof value, `${key} should be a string`).toBe("string");
      expect((value as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
      expect((value as string).trim(), `${key} should not be blank`).not.toBe("");
    }
  });

  it("no value contains the '(confirm)' placeholder residue", () => {
    for (const [key, value] of Object.entries(EP)) {
      expect(value as string, `${key} must not contain "(confirm)"`).not.toContain("(confirm)");
    }
  });

  it("every value begins with '/api/'", () => {
    for (const [key, value] of Object.entries(EP)) {
      expect(value as string, `${key} should be an /api/ path`).toMatch(/^\/api\//);
    }
  });
});

describe("endpoints — known gated keys (/api/mobile/*)", () => {
  it("exposes the known gated keys", () => {
    for (const key of GATED_KEYS) {
      expect(EP, `missing gated key ${key}`).toHaveProperty(key);
    }
  });

  it("every gated value starts with '/api/mobile/'", () => {
    for (const key of GATED_KEYS) {
      expect(EP[key], `${key} should be a /api/mobile/ path`).toMatch(/^\/api\/mobile\//);
    }
  });
});

describe("endpoints — known read keys (/api/web/*)", () => {
  it("exposes the known read keys", () => {
    for (const key of READ_KEYS) {
      expect(EP, `missing read key ${key}`).toHaveProperty(key);
    }
  });

  it("every read value starts with '/api/web/'", () => {
    for (const key of READ_KEYS) {
      expect(EP[key], `${key} should be a /api/web/ path`).toMatch(/^\/api\/web\//);
    }
  });
});
