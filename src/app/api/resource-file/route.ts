import { NextRequest, NextResponse } from "next/server";

// Same-origin file proxy for resource documents (PDF/images/etc.).
//
// react-doc-viewer's PDF renderer fetches the file IN THE BROWSER, but the
// storage bucket (storage.googleapis.com/yp-storage) returns no
// Access-Control-Allow-Origin header, so a direct browser fetch is blocked by
// CORS. This route fetches the file server-side (server→server has no CORS) and
// streams it back from our own origin, so the viewer can load it.
//
// SSRF guard: only the known public storage hosts are allowed; everything else
// is rejected. The files are already public, so no auth is required.

const ALLOWED_HOSTS = new Set<string>([
  "storage.googleapis.com",
  "admin.youngprofessionals.global",
]);

function isAllowed(target: URL): boolean {
  if (target.protocol !== "https:") return false;
  if (!ALLOWED_HOSTS.has(target.hostname)) return false;
  // Restrict the GCS host to the project's bucket path only.
  if (
    target.hostname === "storage.googleapis.com" &&
    !target.pathname.startsWith("/yp-storage/")
  ) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const asDownload = req.nextUrl.searchParams.get("download") === "1";

  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!isAllowed(target)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream responded ${upstream.status}` },
      { status: 502 },
    );
  }

  // Some GCS objects are stored with a generic/missing content-type, which
  // makes the browser download the file instead of rendering it inline (blank
  // PDF iframe). Infer a sensible type from the file extension in that case.
  const EXT_CONTENT_TYPE: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
  };
  const ext = (target.pathname.split(".").pop() || "").toLowerCase();
  const upstreamType = upstream.headers.get("content-type") || "";
  const isGeneric =
    !upstreamType ||
    upstreamType.startsWith("application/octet-stream") ||
    upstreamType.startsWith("binary/octet-stream");
  const contentType =
    isGeneric && EXT_CONTENT_TYPE[ext]
      ? EXT_CONTENT_TYPE[ext]
      : upstreamType || "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "private, max-age=300");

  const filename =
    decodeURIComponent(target.pathname.split("/").pop() || "file").replace(
      /["\r\n]/g,
      "",
    );
  headers.set(
    "Content-Disposition",
    `${asDownload ? "attachment" : "inline"}; filename="${filename}"`,
  );

  return new Response(upstream.body, { status: 200, headers });
}
