import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Headers that should NOT be forwarded to the backend
const STRIPPED_REQUEST_HEADERS = ["host", "origin", "referer"];

// Headers that should NOT be forwarded back to the browser
const STRIPPED_RESPONSE_HEADERS = [
  "transfer-encoding",
  "content-encoding",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
];

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const targetUrl = `${BACKEND_URL}${pathname}${search}`;

  // Build headers — strip browser-injected CORS headers
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Forward the request to the backend
  const backendRes = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.body,
    redirect: "manual",
    // @ts-expect-error -- Node fetch supports duplex for streaming body
    duplex: "half",
  });

  // Build response — forward backend headers minus CORS ones
  // (the browser already thinks it's same-origin, so CORS headers are irrelevant)
  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.includes(key.toLowerCase())) {
      // Fix Set-Cookie for cross-device LAN access:
      // Remove Domain, Secure, and SameSite restrictions so the cookie
      // works when accessed from a different device over HTTP.
      if (key.toLowerCase() === "set-cookie") {
        const fixed = value
          .replace(/;\s*Domain=[^;]*/gi, "")
          .replace(/;\s*Secure/gi, "")
          .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
        resHeaders.append(key, fixed);
      } else {
        resHeaders.set(key, value);
      }
    }
  });

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: resHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
