import { describe, it, expect, afterEach } from "vitest";
import {
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  type CookieStore,
} from "@/lib/authCookies";

// authCookies.ts — Decision D7: cookie maxAge is DERIVED from the real token TTL
// (preferring backend `expires_in`, else the JWT `exp` claim), NOT a hardcoded
// {60s, 24h, 7d, session} lifetime. These tests assert that derivation plus the
// fixed cookie attributes (httpOnly / sameSite / secure / path) and clearing.

interface SetCall {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
    path?: string;
    maxAge?: number;
  };
}

/** Fake cookie store capturing every .set()/.delete() call. */
function makeStore() {
  const sets: SetCall[] = [];
  const deletes: string[] = [];
  const store: CookieStore = {
    set(name: string, value: string, options?: SetCall["options"]) {
      sets.push({ name, value, options });
      return undefined;
    },
    delete(name: string) {
      deletes.push(name);
      return undefined;
    },
  };
  return { store, sets, deletes };
}

function base64url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Build a structurally-valid (unsigned) JWT carrying the given claims. */
function makeJwt(claims: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  return `${header}.${payload}.sig`;
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// Vitest exposes process.env via a proxy that supports plain assignment but
// rejects Object.defineProperty — so set NODE_ENV directly.
function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  }
}

describe("setAuthCookies — maxAge derived from token, not a constant", () => {
  afterEach(() => {
    // NODE_ENV is mutated by individual tests; always restore.
    setNodeEnv(ORIGINAL_NODE_ENV);
  });

  it("derives the access cookie maxAge (~900s) from the JWT exp claim", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = nowSec + 900; // 15 minutes out
    const token = makeJwt({ sub: "u1", exp });

    const { store, sets } = makeStore();
    setAuthCookies(store, { access: token });

    const accessSet = sets.find((s) => s.name === ACCESS_COOKIE);
    expect(accessSet, "access cookie should have been set").toBeDefined();

    const maxAge = accessSet!.options?.maxAge;
    expect(typeof maxAge).toBe("number");
    // ~900s, allowing a few seconds of clock drift during the test run.
    expect(maxAge!).toBeGreaterThanOrEqual(895);
    expect(maxAge!).toBeLessThanOrEqual(901);

    // Explicitly NOT one of the legacy hardcoded lifetimes.
    expect(maxAge).not.toBe(60); // 60s
    expect(maxAge).not.toBe(86400); // 24h
    expect(maxAge).not.toBe(604800); // 7d
  });

  it("honors an explicit expires_in provided alongside the token", () => {
    // JWT exp says ~900s, but expires_in (1234s) MUST win.
    const nowSec = Math.floor(Date.now() / 1000);
    const token = makeJwt({ sub: "u1", exp: nowSec + 900 });

    const { store, sets } = makeStore();
    setAuthCookies(store, { access: token, expiresIn: 1234 });

    const accessSet = sets.find((s) => s.name === ACCESS_COOKIE);
    expect(accessSet?.options?.maxAge).toBe(1234);
  });

  it("derives the refresh cookie maxAge from its own JWT exp", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const access = makeJwt({ sub: "u1", exp: nowSec + 900 });
    const refresh = makeJwt({ sub: "u1", exp: nowSec + 5000 });

    const { store, sets } = makeStore();
    setAuthCookies(store, { access, refresh });

    const refreshSet = sets.find((s) => s.name === REFRESH_COOKIE);
    expect(refreshSet, "refresh cookie should have been set").toBeDefined();
    const maxAge = refreshSet!.options?.maxAge;
    expect(maxAge!).toBeGreaterThanOrEqual(4995);
    expect(maxAge!).toBeLessThanOrEqual(5001);
    expect(maxAge).not.toBe(604800); // not the 7d fallback
  });

  it("falls back to a positive default maxAge for a non-JWT token", () => {
    const { store, sets } = makeStore();
    setAuthCookies(store, { access: "not-a-jwt-opaque-token" });

    const accessSet = sets.find((s) => s.name === ACCESS_COOKIE);
    const maxAge = accessSet!.options?.maxAge;
    expect(typeof maxAge).toBe("number");
    expect(maxAge!).toBeGreaterThan(0);
  });
});

describe("setAuthCookies — fixed cookie attributes", () => {
  afterEach(() => {
    setNodeEnv(ORIGINAL_NODE_ENV);
  });

  it("sets httpOnly:true, sameSite:'lax', path:'/' on the access cookie", () => {
    const { store, sets } = makeStore();
    setAuthCookies(store, { access: makeJwt({ exp: Math.floor(Date.now() / 1000) + 300 }) });

    const opts = sets.find((s) => s.name === ACCESS_COOKIE)!.options!;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  it("secure is FALSE outside production", () => {
    setNodeEnv("development");
    const { store, sets } = makeStore();
    setAuthCookies(store, { access: makeJwt({ exp: Math.floor(Date.now() / 1000) + 300 }) });

    expect(sets.find((s) => s.name === ACCESS_COOKIE)!.options!.secure).toBe(false);
  });

  it("secure is TRUE in production", () => {
    setNodeEnv("production");
    const { store, sets } = makeStore();
    setAuthCookies(store, { access: makeJwt({ exp: Math.floor(Date.now() / 1000) + 300 }) });

    expect(sets.find((s) => s.name === ACCESS_COOKIE)!.options!.secure).toBe(true);
  });
});

describe("clearAuthCookies", () => {
  it("deletes the access and refresh cookies", () => {
    const { store, deletes } = makeStore();
    clearAuthCookies(store);

    expect(deletes).toContain(ACCESS_COOKIE);
    expect(deletes).toContain(REFRESH_COOKIE);
  });
});
