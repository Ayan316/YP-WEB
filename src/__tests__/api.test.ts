import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";

// src/lib/api.ts — the single server-side gateway (D2).
//
// Fully isolated: NO real network (global.fetch is mocked), NO real backend, NO
// real cookies (next/headers `cookies()` is mocked with an in-memory jar). We
// assert auth-header attachment per AuthMode, strict short-circuit, the 401 ->
// refresh -> single-retry path, the uniform envelope, and that a raw token never
// reaches console.log / console.error.

// BACKEND_URL is read at module load (`const BASE = process.env.BACKEND_URL!`),
// so it must be defined BEFORE api.ts is imported (vi.mock + import are hoisted,
// but plain assignment here runs at top-of-module eval which is early enough for
// the dynamic import we use below). Set it defensively anyway.
const BASE = "http://backend.test";
process.env.BACKEND_URL = BASE;

// ---- Mock next/headers: cookies() returns our controllable jar ---------------
let cookieJar: Map<string, string>;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get(name: string) {
      return cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined;
    },
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Imported AFTER the mock is registered (vi.mock is hoisted above imports).
import { api } from "@/lib/api";

// ---- fetch mock helpers ------------------------------------------------------
type FetchHandler = (url: string, init: RequestInit) => Response;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Records every fetch call's URL + headers for later assertions. */
interface RecordedCall {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

let calls: RecordedCall[];

function installFetch(handler: FetchHandler) {
  const mock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers: Record<string, string> = {};
    // init.headers is a plain object in api.ts.
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
        headers[k] = v;
      }
    }
    calls.push({ url, init, headers });
    return handler(url, init);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  cookieJar = new Map();
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const TOKEN = "header.payload-AAA.signature-BBB"; // sentinel raw token

describe("api — auth: 'none'", () => {
  it("carries NO Authorization header even when an access cookie exists", async () => {
    cookieJar.set("access", TOKEN);
    installFetch(() => jsonResponse(200, { ok: 1 }));

    const res = await api.get("/api/web/jobs", { auth: "none" });

    expect(res.status).toBe("OK");
    expect(calls).toHaveLength(1);
    expect(calls[0].headers).not.toHaveProperty("Authorization");
    expect(calls[0].url).toBe(`${BASE}/api/web/jobs`);
  });
});

describe("api — auth: 'strict' with no access cookie", () => {
  it("returns UNAUTHENTICATED and does NOT hit the main endpoint", async () => {
    // No access AND no refresh cookie -> refreshInline returns null before fetch.
    const mock = installFetch(() => jsonResponse(200, { should: "not happen" }));

    const res = await api.post("/api/mobile/user/save-job", { id: 1 }, { auth: "strict" });

    expect(res.status).toBe("ERROR");
    expect(res.code).toBe("UNAUTHENTICATED");
    expect(res.data).toBeNull();

    // The main endpoint must never be hit. With no refresh cookie, fetch is not
    // called at all.
    expect(mock).not.toHaveBeenCalled();
    const mainHits = calls.filter((c) => c.url.includes("/api/mobile/user/save-job"));
    expect(mainHits).toHaveLength(0);
  });
});

describe("api — auth: 'soft'", () => {
  it("attaches 'Authorization: Bearer <token>' when the access cookie exists", async () => {
    cookieJar.set("access", TOKEN);
    installFetch(() => jsonResponse(200, { ok: 1 }));

    const res = await api.get("/api/web/user/get-profile", { auth: "soft" });

    expect(res.status).toBe("OK");
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("omits the Authorization header when no access cookie exists but STILL calls the backend", async () => {
    // no access cookie
    installFetch(() => jsonResponse(200, { ok: 1 }));

    const res = await api.get("/api/web/user/get-profile", { auth: "soft" });

    expect(res.status).toBe("OK");
    expect(calls).toHaveLength(1); // backend was still called
    expect(calls[0].headers).not.toHaveProperty("Authorization");
  });
});

describe("api — 401 triggers refresh then ONE retry", () => {
  it("refreshes via the refresh cookie and retries the original request once with the new token", async () => {
    cookieJar.set("access", "stale-access-token");
    cookieJar.set("refresh", "refresh-token-xyz");

    const NEW_TOKEN = "fresh-access-token-999";

    installFetch((url) => {
      if (url.includes("/api/mobile/auth/token/refresh")) {
        return jsonResponse(200, {
          status: "OK",
          data: { access_token: NEW_TOKEN, refresh_token: "refresh-token-xyz" },
        });
      }
      // Main endpoint: first hit (with stale token) -> 401; second hit -> 200.
      const priorMainHits = calls.filter(
        (c) =>
          c.url.includes("/api/mobile/user/saved-jobs") &&
          c.url !== url, // exclude the current in-flight call (already pushed)
      );
      // `calls` already contains the current call; count main hits so far.
      const mainSoFar = calls.filter((c) => c.url.includes("/api/mobile/user/saved-jobs")).length;
      void priorMainHits;
      if (mainSoFar <= 1) return jsonResponse(401, { message: "expired" });
      return jsonResponse(200, { items: [] });
    });

    const res = await api.get("/api/mobile/user/saved-jobs", { auth: "strict" });

    expect(res.status).toBe("OK");

    const mainHits = calls.filter((c) => c.url.includes("/api/mobile/user/saved-jobs"));
    const refreshHits = calls.filter((c) => c.url.includes("/api/mobile/auth/token/refresh"));

    // Exactly: main(401) + refresh + main-retry(200).
    expect(refreshHits).toHaveLength(1);
    expect(mainHits).toHaveLength(2); // original + ONE retry (not more)

    // The retry must carry the NEW token, not the stale one.
    const retry = mainHits[1];
    expect(retry.headers.Authorization).toBe(`Bearer ${NEW_TOKEN}`);
  });

  it("does NOT attempt a refresh on 401 when auth is 'none'", async () => {
    cookieJar.set("refresh", "refresh-token-xyz");
    installFetch(() => jsonResponse(401, { message: "nope" }));

    const res = await api.get("/api/web/jobs", { auth: "none" });

    expect(res.status).toBe("ERROR");
    const refreshHits = calls.filter((c) => c.url.includes("/api/mobile/auth/token/refresh"));
    expect(refreshHits).toHaveLength(0); // no refresh for auth:'none'
    // Only the single original call happened.
    expect(calls).toHaveLength(1);
  });
});

describe("api — uniform envelope", () => {
  it("success -> { status: 'OK', data }", async () => {
    const payload = { hello: "world", n: 42 };
    installFetch(() => jsonResponse(200, payload));

    const res = await api.get<typeof payload>("/api/web/jobs", { auth: "none" });

    expect(res).toMatchObject({ status: "OK", data: payload });
  });

  it("error -> { status: 'ERROR', message, data: null }", async () => {
    installFetch(() => jsonResponse(400, { message: "Bad input" }));

    const res = await api.post("/api/web/jobs", { x: 1 }, { auth: "none" });

    expect(res.status).toBe("ERROR");
    expect(res.message).toBe("Bad input");
    expect(res.data).toBeNull();
  });

  it("error with no message -> falls back to 'Upstream error'", async () => {
    installFetch(() => jsonResponse(500, {})); // 5xx is retried then surfaced as ERROR

    const res = await api.get("/api/web/jobs", { auth: "none" });

    expect(res.status).toBe("ERROR");
    expect(res.message).toBe("Upstream error");
    expect(res.data).toBeNull();
  });
});

describe("api — never leaks a token to the console", () => {
  it("does not pass the raw token string to console.log or console.error", async () => {
    cookieJar.set("access", TOKEN);
    installFetch(() => jsonResponse(200, { ok: 1 }));

    const logSpy: MockInstance = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy: MockInstance = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await api.get("/api/web/user/get-profile", { auth: "soft" });
      expect(res.status).toBe("OK");
    } finally {
      // Inspect every argument of every call before restoring.
      const allArgs = [
        ...logSpy.mock.calls.flat(),
        ...errSpy.mock.calls.flat(),
      ];
      for (const arg of allArgs) {
        const text = typeof arg === "string" ? arg : JSON.stringify(arg ?? null);
        expect(text).not.toContain(TOKEN);
      }
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });
});
