export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

const PUBLIC_MEDIA_PREFIX = "/_emdash/api/media/file/";

export function isPrivateResponseRequest(request: Request, pathname: string): boolean {
  if (request.headers.has("cookie") || request.headers.has("authorization")) {
    return true;
  }

  if (pathname === "/admin" || pathname.startsWith("/_preview")) {
    return true;
  }

  if (!pathname.startsWith("/_emdash")) {
    return false;
  }

  return !pathname.startsWith(PUBLIC_MEDIA_PREFIX);
}

export function withPrivateResponseHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
