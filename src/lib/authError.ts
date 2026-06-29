// Shared client/server helper for the gated-action login gate (REQUIREMENTS §5 R4).
//
// The server gateway (src/lib/api.ts) returns `code:"UNAUTHENTICATED"` in its
// envelope when a strict Server Action is called without a valid session. The
// migrated service facades surface that to their (try/catch) call sites by
// throwing an Error tagged with `code:"UNAUTHENTICATED"`. Call sites use
// `isUnauthenticatedError(err)` to open the login gate instead of toasting a
// confusing error — and NEVER to force-logout an anonymous user.

export const UNAUTHENTICATED_CODE = "UNAUTHENTICATED" as const;

/** An Error carrying the `UNAUTHENTICATED` discriminator from the gateway. */
export class UnauthenticatedError extends Error {
  code = UNAUTHENTICATED_CODE;
  constructor(message = "You must be logged in to perform this action.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/** True when an unknown caught value is the gateway's UNAUTHENTICATED signal. */
export function isUnauthenticatedError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { code?: string }).code === UNAUTHENTICATED_CODE
  );
}
