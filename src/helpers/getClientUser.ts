// helpers/getClientUser.ts

export function getClientUser() {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(^| )user_info=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[2]));
  } catch {
    return null;
  }
}
